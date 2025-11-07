/**
 * Email Service for Invoice Delivery
 * 
 * Provides email delivery functionality as a fallback when CamInvoice delivery fails
 * or when customers don't have CamInvoice endpoint IDs.
 */

import nodemailer from 'nodemailer'

export interface EmailDeliveryParams {
  to: string
  subject: string
  html: string
  attachments?: EmailAttachment[]
}

export interface EmailAttachment {
  filename: string
  content: Buffer | string
  contentType?: string
}

export interface InvoiceEmailParams {
  customerEmail: string
  customerName: string
  invoiceNumber: string
  invoiceAmount: string
  currency: string
  issueDate: string
  pdfBuffer?: Buffer
  verificationUrl?: string
  tenantName: string
}

export interface EmailDeliveryResult {
  success: boolean
  messageId?: string
  error?: string
}

// Email templates
function generateInvoiceEmailTemplate(params: InvoiceEmailParams): string {
  const {
    customerName,
    invoiceNumber,
    invoiceAmount,
    currency,
    issueDate,
    verificationUrl,
    tenantName,
  } = params

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .invoice-details { background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .footer { background-color: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 14px; color: #6c757d; }
        .btn { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .amount { font-size: 24px; font-weight: bold; color: #28a745; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Invoice from ${tenantName}</h1>
          <p>Dear ${customerName},</p>
          <p>Please find your invoice attached to this email.</p>
        </div>
        
        <div class="invoice-details">
          <h2>Invoice Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Invoice Number:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Issue Date:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${issueDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Amount:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><span class="amount">${currency} ${invoiceAmount}</span></td>
            </tr>
          </table>
          
          ${verificationUrl ? `
            <div style="margin-top: 20px;">
              <p><strong>E-Invoice Verification:</strong></p>
              <p>This invoice has been submitted to the Cambodia e-Invoice system. You can verify its authenticity using the link below:</p>
              <a href="${verificationUrl}" class="btn" target="_blank">Verify Invoice</a>
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p><strong>Important:</strong> This is an official invoice. Please keep this email and the attached PDF for your records.</p>
          <p>If you have any questions about this invoice, please contact ${tenantName}.</p>
          <p><small>This email was sent automatically by the CamInvoice system.</small></p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Create email transporter
function createEmailTransporter() {
  const config = {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  }

  // For development, use ethereal email if no SMTP config is provided
  if (!process.env.SMTP_HOST && process.env.NODE_ENV === 'development') {
    console.warn('No SMTP configuration found. Email delivery will be simulated.')
    return null
  }

  return nodemailer.createTransport(config)
}

/**
 * Send invoice email to customer
 */
export async function sendInvoiceEmail(params: InvoiceEmailParams): Promise<EmailDeliveryResult> {
  try {
    const transporter = createEmailTransporter()
    
    if (!transporter) {
      // Simulate email sending in development
      console.log('📧 Simulated email delivery:', {
        to: params.customerEmail,
        subject: `Invoice ${params.invoiceNumber} from ${params.tenantName}`,
        hasAttachment: !!params.pdfBuffer,
      })
      
      return {
        success: true,
        messageId: `simulated-${Date.now()}`,
      }
    }

    const attachments: EmailAttachment[] = []
    if (params.pdfBuffer) {
      attachments.push({
        filename: `Invoice-${params.invoiceNumber}.pdf`,
        content: params.pdfBuffer,
        contentType: 'application/pdf',
      })
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: params.customerEmail,
      subject: `Invoice ${params.invoiceNumber} from ${params.tenantName}`,
      html: generateInvoiceEmailTemplate(params),
      attachments: attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    }

    const result = await transporter.sendMail(mailOptions)
    
    return {
      success: true,
      messageId: result.messageId,
    }
  } catch (error: any) {
    console.error('Email delivery failed:', error)
    
    return {
      success: false,
      error: error.message || 'Email delivery failed',
    }
  }
}

/**
 * Send generic email
 */
export async function sendEmail(params: EmailDeliveryParams): Promise<EmailDeliveryResult> {
  try {
    const transporter = createEmailTransporter()
    
    if (!transporter) {
      console.log('📧 Simulated email delivery:', {
        to: params.to,
        subject: params.subject,
        hasAttachments: !!params.attachments?.length,
      })
      
      return {
        success: true,
        messageId: `simulated-${Date.now()}`,
      }
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    }

    const result = await transporter.sendMail(mailOptions)
    
    return {
      success: true,
      messageId: result.messageId,
    }
  } catch (error: any) {
    console.error('Email delivery failed:', error)
    
    return {
      success: false,
      error: error.message || 'Email delivery failed',
    }
  }
}

export const EmailService = {
  sendInvoiceEmail,
  sendEmail,
}
