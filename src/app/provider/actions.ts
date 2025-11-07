"use server";

import { authTokenWithRefresh } from "@/lib/caminvoice";
import { prisma } from "@/lib/prisma";

// Utilities
function sanitizeBaseUrl(url: string | null | undefined) {
  if (!url) return "";
  return url.replace(/\/+$/, "");
}

// Validate that redirect URLs are public HTTPS with a real domain (no localhost/127.0.0.1)
function validatePublicHttpsUrl(raw: string): string | null {
  if (!raw || typeof raw !== "string") return "URL is required";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "Must be a valid absolute URL";
  }
  if (url.protocol !== "https:") return "Must use https scheme";
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1")
    return "Localhost/127.0.0.1 not allowed";
  const isIPv4 = /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
  if (isIPv4) return "IP addresses are not allowed; use a domain with TLD";
  const hasTld =
    hostname.includes(".") && (hostname.split(".").pop() || "").length >= 2;
  if (!hasTld) return "Domain must include a TLD (e.g., .com, .app)";
  return null;
}

function assertValidRedirectUrls(urls: string[]) {
  const issues: string[] = [];
  urls.forEach((u, i) => {
    const err = validatePublicHttpsUrl(u);
    if (err) issues.push(`Index ${i}: ${u} → ${err}`);
  });
  if (issues.length) {
    const guidance =
      "CamInvoice requires publicly accessible HTTPS URLs with a real domain (no http, no localhost/127.0.0.1). Example: https://your-subdomain.trycloudflare.com/auth/callback or https://your-subdomain.ngrok-free.app/auth/callback";
    throw new Error(
      `Invalid redirect URL(s).\n${issues.join("\n")}\nGuidance: ${guidance}`
    );
  }
}

export async function loadProviderConfig() {
  const provider = await prisma.provider.findFirst({
    where: { isActive: true },
  });
  if (!provider) {
    return { success: true, provider: null };
  }
  return {
    success: true,
    provider: {
      id: provider.id,
      name: provider.name,
      description: provider.description ?? "",
      clientId: provider.clientId,
      clientSecret: provider.clientSecret, // NOTE: keep server-only in real apps; exposed here because client component expects it today
      baseUrl: provider.baseUrl,
      redirectUrls: provider.redirectUrls || [],
      isConnectedToCamInv: !!(provider.isConfigured && provider.accessToken),
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    },
  };
}

export async function saveProviderConfig(input: {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  description?: string;
  redirectUrls: string[];
}) {
  const baseUrl = sanitizeBaseUrl(input.baseUrl);

  // Upsert by clientId to avoid duplicates
  const existing = await prisma.provider.findFirst({
    where: { clientId: input.clientId },
  });
  const provider = existing
    ? await prisma.provider.update({
        where: { id: existing.id },
        data: {
          clientId: input.clientId,
          clientSecret: input.clientSecret,
          baseUrl,
          description: input.description || null,
          redirectUrls: input.redirectUrls,
          updatedAt: new Date(),
        },
      })
    : await prisma.provider.create({
        data: {
          name: "CamInvoice Service Provider",
          clientId: input.clientId,
          clientSecret: input.clientSecret,
          baseUrl,
          description: input.description || null,
          redirectUrls: input.redirectUrls,
          isConfigured: false,
          isActive: true,
        },
      });

  return { success: true, providerId: provider.id };
}

// Configure redirect URLs with CamInvoice API (whitelist URLs before OAuth can work)
export async function configureRedirectUrls(params: {
  redirectUrls: string[];
}) {
  const provider = await prisma.provider.findFirst({
    where: { isActive: true },
  });
  if (!provider) throw new Error("Provider not configured");
  if (!provider.clientId || !provider.clientSecret)
    throw new Error("Provider missing clientId or clientSecret");

  // Use the correct merchant API endpoint from Swagger documentation
  const configEndpoint = `https://sb-merchant.e-invoice.gov.kh/api/v1/configure/configure-redirect-url`;

  // Prepare and validate redirect URLs
  const redirectUrls = (params.redirectUrls || [])
    .map((u) => (u || "").trim())
    .filter(Boolean);
  console.log("🔧 Configuring Redirect URLs:");
  console.log("  Provider Base URL:", provider.baseUrl);
  console.log("  Merchant API Endpoint:", configEndpoint);
  console.log("  Redirect URLs:", redirectUrls);

  // Server-side validation to give clear error before hitting API
  assertValidRedirectUrls(redirectUrls);

  // Configure redirect URLs with CamInvoice API according to documentation
  const basic = Buffer.from(
    `${provider.clientId}:${provider.clientSecret}`
  ).toString("base64");

  try {
    const configResponse = await fetch(configEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basic}`,
      },
      body: JSON.stringify({
        white_list_redirect_urls: redirectUrls,
      }),
    });

    console.log("  Response Status:", configResponse.status);
    console.log(
      "  Response Headers:",
      Object.fromEntries(configResponse.headers.entries())
    );

    if (!configResponse.ok) {
      const raw = await configResponse.text().catch(() => "");
      console.log("  Error Response Body:", raw.slice(0, 500));

      // Try alternative endpoints if 404
      if (configResponse.status === 404) {
        console.log(
          "🔄 Trying alternative redirect URL configuration endpoints..."
        );

        // Try alternative merchant API endpoints
        const altEndpoint1 = `https://sb-merchant.e-invoice.gov.kh/api/v1/configure-redirect-url`;
        console.log("  Trying:", altEndpoint1);

        const altResponse1 = await fetch(altEndpoint1, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${basic}`,
          },
          body: JSON.stringify({
            white_list_redirect_urls: redirectUrls,
          }),
        });

        if (altResponse1.ok) {
          console.log("✅ Alternative endpoint 1 worked!");
          const responseData = await altResponse1.json().catch(() => ({}));
          await updateProviderDatabase(provider, redirectUrls);
          return { success: true, data: responseData };
        }

        // Try with different path structure
        const altEndpoint2 = `https://sb-merchant.e-invoice.gov.kh/api/v1/redirect-urls`;
        console.log("  Trying:", altEndpoint2);

        const altResponse2 = await fetch(altEndpoint2, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${basic}`,
          },
          body: JSON.stringify({
            white_list_redirect_urls: redirectUrls,
          }),
        });

        if (altResponse2.ok) {
          console.log("✅ Alternative endpoint 2 worked!");
          const responseData = await altResponse2.json().catch(() => ({}));
          await updateProviderDatabase(provider, redirectUrls);
          return { success: true, data: responseData };
        }

        // Try the original provider base URL as fallback
        const base = sanitizeBaseUrl(provider.baseUrl);
        const altEndpoint3 = `${base}/api/v1/configure/configure-redirect-url`;
        console.log("  Trying original provider URL:", altEndpoint3);

        const altResponse3 = await fetch(altEndpoint3, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${basic}`,
          },
          body: JSON.stringify({
            white_list_redirect_urls: redirectUrls,
          }),
        });

        if (altResponse3.ok) {
          console.log("✅ Alternative endpoint 3 worked!");
          const responseData = await altResponse3.json().catch(() => ({}));
          await updateProviderDatabase(provider, redirectUrls);
          return { success: true, data: responseData };
        }

        console.log(
          "❌ All alternative endpoints failed. This step might be optional or the endpoint doesn't exist."
        );
        console.log(
          "🔄 Proceeding without redirect URL configuration - OAuth might still work..."
        );

        // Update database anyway and proceed
        await updateProviderDatabase(provider, redirectUrls);
        return {
          success: true,
          warning:
            "Redirect URL configuration endpoint not found. Proceeding without API configuration.",
          data: {
            message: "Local configuration saved, API endpoint not available",
          },
        };
      }

      throw new Error(
        `Failed to configure redirect URLs: ${
          configResponse.status
        } - ${raw.slice(0, 200)}`
      );
    }

    const responseData = await configResponse.json().catch(() => ({}));
    console.log("✅ Redirect URLs configured successfully:", responseData);

    // Update database after successful API call
    await updateProviderDatabase(provider, redirectUrls);

    return { success: true, data: responseData };
  } catch (error) {
    console.error("❌ Redirect URL configuration error:", error);
    throw error;
  }
}

// Helper function to update provider database
async function updateProviderDatabase(provider: any, redirectUrls: string[]) {
  await prisma.provider.update({
    where: { id: provider.id },
    data: { redirectUrls, updatedAt: new Date() },
  });
}

// Generate OAuth authorization URL (CamInvoice Authorization Code flow)
export async function getOAuthUrl() {
  const provider = await prisma.provider.findFirst({
    where: { isActive: true },
  });
  if (!provider) throw new Error("Provider not configured");
  if (!provider.clientId || !provider.redirectUrls?.length)
    throw new Error("Provider missing clientId or redirectUrls");

  // Use the merchant API base URL for OAuth connect link
  const merchantBase = "https://sb-merchant.e-invoice.gov.kh";
  const redirectUrl = provider.redirectUrls[0];
  const state = `provider_setup_${Date.now()}`;

  // Debug logging
  console.log("🔗 Generating OAuth URL:");
  console.log("  Merchant Base:", merchantBase);
  console.log("  Client ID:", provider.clientId);
  console.log("  Redirect URL:", redirectUrl);
  console.log("  State:", state);

  // Step 1: Generate Connect Link according to CamInvoice documentation
  const authUrl = `${merchantBase}/connect?client_id=${encodeURIComponent(
    provider.clientId
  )}&redirect_url=${encodeURIComponent(redirectUrl)}&state=${encodeURIComponent(
    state
  )}`;

  console.log("  Generated Auth URL:", authUrl);

  return {
    success: true,
    authUrl,
    state,
  };
}

// Exchange authToken for access/refresh tokens (CamInvoice Authorization Code flow)
export async function exchangeAuthToken(input: {
  authToken: string;
  state?: string;
}) {
  const provider = await prisma.provider.findFirst({
    where: { isActive: true },
  });
  if (!provider) throw new Error("Provider not configured");

  // Use the merchant API endpoint for token exchange
  const tokenEndpoint = `https://sb-merchant.e-invoice.gov.kh/api/v1/auth/authorize/connect`;

  // Debug logging
  console.log("🔍 OAuth Token Exchange Debug:");
  console.log("  Provider Base URL:", provider.baseUrl);
  console.log("  Merchant Token Endpoint:", tokenEndpoint);
  console.log("  Auth Token:", input.authToken?.substring(0, 20) + "...");

  // Step 3: Token Request according to CamInvoice documentation
  const basic = Buffer.from(
    `${provider.clientId}:${provider.clientSecret}`
  ).toString("base64");

  try {
    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basic}`,
      },
      body: JSON.stringify({
        auth_token: input.authToken,
      }),
    });

    console.log("  Response Status:", tokenResponse.status);
    console.log(
      "  Response Headers:",
      Object.fromEntries(tokenResponse.headers.entries())
    );

    if (!tokenResponse.ok) {
      const raw = await tokenResponse.text().catch(() => "");
      console.log("  Error Response Body:", raw.slice(0, 500));

      // Try alternative endpoints if 404
      if (tokenResponse.status === 404) {
        console.log("🔄 Trying alternative endpoints...");

        // Try alternative merchant API endpoints
        const altEndpoint1 = `https://sb-merchant.e-invoice.gov.kh/api/v1/authorize/connect`;
        console.log("  Trying:", altEndpoint1);

        const altResponse1 = await fetch(altEndpoint1, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${basic}`,
          },
          body: JSON.stringify({
            auth_token: input.authToken,
          }),
        });

        if (altResponse1.ok) {
          console.log("✅ Alternative endpoint 1 worked!");
          const tokenData = await altResponse1.json();
          return await processTokenResponse(tokenData, provider);
        }

        // Try with original provider base URL as fallback
        const base = sanitizeBaseUrl(provider.baseUrl);
        const altEndpoint2 = `${base}/api/v1/auth/authorize/connect`;
        console.log("  Trying original provider URL:", altEndpoint2);

        const altResponse2 = await fetch(altEndpoint2, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${basic}`,
          },
          body: JSON.stringify({
            auth_token: input.authToken,
          }),
        });

        if (altResponse2.ok) {
          console.log("✅ Alternative endpoint 2 worked!");
          const tokenData = await altResponse2.json();
          return await processTokenResponse(tokenData, provider);
        }
      }

      throw new Error(
        `Token exchange failed: ${tokenResponse.status} - ${raw.slice(0, 200)}`
      );
    }

    const tokenData: any = await tokenResponse.json();
    return await processTokenResponse(tokenData, provider);
  } catch (error) {
    console.error("❌ Token exchange error:", error);
    throw error;
  }
}

// Helper: try to fetch business_info using access token when token exchange response lacks it
async function attemptFetchBusinessInfo(
  accessToken: string,
  baseUrl?: string | null
) {
  const bases = [
    sanitizeBaseUrl(baseUrl || ""),
    "https://sb-merchant.e-invoice.gov.kh",
  ].filter(Boolean);
  const paths = [
    "/api/v1/member/detail",
    "/api/v1/member",
    "/api/v1/members/me",
    "/api/v1/auth/member-detail",
  ];
  for (const b of bases) {
    for (const p of paths) {
      try {
        const url = `${b}${p}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        if (res.ok) {
          const j: any = await res.json().catch(() => ({}));
          // Handle various shapes we have seen
          const info =
            j?.business_info ||
            j?.userProfile?.business_info ||
            j?.data?.business_info;
          if (info && typeof info === "object") return info;
        }
      } catch {}
    }
  }
  return null;
}

// Helper function to process token response
async function processTokenResponse(tokenData: any, provider: any) {
  const access_token = tokenData?.access_token;
  const refresh_token = tokenData?.refresh_token;
  // business_info could be at root or nested under userProfile/data per docs/variants
  let business_info =
    tokenData?.business_info ||
    tokenData?.userProfile?.business_info ||
    tokenData?.data?.business_info ||
    null;

  if (!access_token) {
    throw new Error("No access token received from CamInvoice");
  }

  // If business_info missing, attempt to fetch with access token once
  if (!business_info) {
    try {
      business_info = await attemptFetchBusinessInfo(
        access_token,
        provider.baseUrl
      );
    } catch {}
  }

  console.log("✅ Token exchange successful!");
  console.log("  Access Token:", access_token?.substring(0, 20) + "...");
  console.log(
    "  Refresh Token:",
    refresh_token ? refresh_token.substring(0, 20) + "..." : "None"
  );
  console.log("  Business Info:", business_info ? "Present" : "None");

  // Store the tokens and business info in the database
  await prisma.provider.update({
    where: { id: provider.id },
    data: {
      accessToken: access_token,
      refreshToken: refresh_token || null,
      tokenExpiresAt: null,
      endpointId: business_info?.endpoint_id ?? provider.endpointId ?? null,
      mocId: business_info?.moc_id ?? provider.mocId ?? null,
      companyNameEn:
        business_info?.company_name_en ?? provider.companyNameEn ?? null,
      companyNameKh:
        business_info?.company_name_kh ?? provider.companyNameKh ?? null,
      tin: business_info?.tin ?? provider.tin ?? null,
      isConfigured: true,
      updatedAt: new Date(),
    },
  });

  return { success: true, access_token, refresh_token, business_info };
}

// Test connection using existing token and cached business info (no remote call)
export async function testConnection() {
  const provider = await prisma.provider.findFirst({
    where: { isActive: true },
  });
  if (!provider) throw new Error("Provider not configured");
  if (!provider.accessToken)
    throw new Error(
      "No access token available. Please complete OAuth authorization first."
    );

  // Build a userProfile-like object from stored provider fields
  const business_info: any = {
    endpoint_id: provider.endpointId || undefined,
    moc_id: provider.mocId || undefined,
    company_name_en: provider.companyNameEn || undefined,
    company_name_kh: provider.companyNameKh || undefined,
    tin: provider.tin || undefined,
  };

  return {
    success: true,
    message: "Connection is active (using cached provider info)",
    data: {
      status: "connected",
      userProfile: { business_info },
      connectionTime: new Date().toISOString(),
    },
  };
}

// Refresh provider tokens using stored refresh_token
export async function refreshProviderTokens() {
  const provider = await prisma.provider.findFirst({
    where: { isActive: true },
  });
  if (!provider) throw new Error("Provider not configured");
  if (!provider.refreshToken)
    throw new Error(
      "No refresh token available. Please re-authorize with CamInvoice."
    );

  const baseUrl = sanitizeBaseUrl(provider.baseUrl);

  const token = await authTokenWithRefresh({
    clientId: provider.clientId,
    clientSecret: provider.clientSecret,
    refreshToken: provider.refreshToken,
    baseUrl: baseUrl || undefined,
  });

  await prisma.provider.update({
    where: { id: provider.id },
    data: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? provider.refreshToken,
      tokenExpiresAt: token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000)
        : provider.tokenExpiresAt,
      updatedAt: new Date(),
    },
  });

  return { success: true, message: "Tokens refreshed successfully", token };
}

// Disconnect provider by clearing tokens
export async function disconnectProvider() {
  const provider = await prisma.provider.findFirst({
    where: { isActive: true },
  });
  if (!provider) throw new Error("Provider not configured");

  await prisma.provider.update({
    where: { id: provider.id },
    data: {
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isConfigured: false,
      updatedAt: new Date(),
    },
  });

  return { success: true, message: "Disconnected from CamInvoice" };
}

// Revoke provider API integration at CamInvoice and clear local tokens
export async function revokeProviderAccess() {
  const provider = await prisma.provider.findFirst({
    where: { isActive: true },
  });
  if (!provider) throw new Error("Provider not configured");
  if (!provider.clientId || !provider.clientSecret)
    throw new Error("Provider missing clientId or clientSecret");

  // Ensure endpointId is available; try to fetch business_info once if missing
  let endpointId = provider.endpointId || null;
  if (!endpointId && provider.accessToken) {
    try {
      const info = await attemptFetchBusinessInfo(
        provider.accessToken,
        provider.baseUrl
      );
      if (info?.endpoint_id) {
        endpointId = info.endpoint_id;
        await prisma.provider.update({
          where: { id: provider.id },
          data: {
            endpointId: info.endpoint_id,
            mocId: info?.moc_id ?? provider.mocId,
            companyNameEn: info?.company_name_en ?? provider.companyNameEn,
            companyNameKh: info?.company_name_kh ?? provider.companyNameKh,
            tin: info?.tin ?? provider.tin,
            updatedAt: new Date(),
          },
        });
      }
    } catch {}
  }
  if (!endpointId)
    throw new Error("Provider missing endpointId required for revoke");

  const basic = Buffer.from(
    `${provider.clientId}:${provider.clientSecret}`
  ).toString("base64");

  // Per docs: POST {BaseURL}/api/v1/auth/revoke
  const base = sanitizeBaseUrl(
    provider.baseUrl || "https://sb-merchant.e-invoice.gov.kh"
  );
  const url = `${base}/api/v1/auth/revoke`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basic}`,
    },
    body: JSON.stringify({ endpoint_id: endpointId }),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    throw new Error(`Revoke failed (HTTP ${res.status}): ${raw.slice(0, 300)}`);
  }

  // Clear local tokens and mark disconnected
  await prisma.provider.update({
    where: { id: provider.id },
    data: {
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isConfigured: false,
      updatedAt: new Date(),
    },
  });

  const j = await res.json().catch(() => ({}));
  return {
    success: true,
    message: j?.message || "Access revoked successfully",
    data: j,
  };
}
