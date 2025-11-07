'use client'

import { useEffect, useState } from 'react'
import { Avatar, Badge, Box, Button, Card, Group, Image, Stack, Text, FileInput } from '@mantine/core'
import { IconUpload, IconPhoto, IconCheck } from '@tabler/icons-react'
import { showNotification } from '@/utils/notifications'
import { useAuth } from '@/hooks/useAuth'

const ACCEPT = ['image/png', 'image/jpeg', 'image/svg+xml']
const MAX_MB = 1

export function TenantLogoUploader() {
  const { user } = useAuth()
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/settings/logo', { credentials: 'include', cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (data?.dataUrl) setPreview(data.dataUrl)
      } catch {}
    }
    load()
  }, [])

  function validateLocal(f: File) {
    if (!ACCEPT.includes(f.type)) {
      showNotification.error('Invalid file type. Use SVG, PNG, or JPG.')
      return false
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      showNotification.error(`File too large. Max ${MAX_MB}MB.`)
      return false
    }
    return true
  }

  async function handleUpload() {
    if (!file) return
    if (!validateLocal(file)) return
    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/settings/logo', { method: 'POST', body: fd, credentials: 'include' })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Upload failed')
      setPreview(data.dataUrl)
      setFile(null)
      showNotification.success('Logo updated successfully')
    } catch (e: any) {
      showNotification.error(e?.message || 'Failed to upload logo')
    } finally {
      setIsUploading(false)
    }
  }

  const canEdit = user?.role === 'TENANT_ADMIN' || user?.role === 'PROVIDER'

  return (
    <Card withBorder>
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Group>
            <Avatar size={48} src={preview || '/PXCLogo.svg'} radius={8} alt="Company Logo">
              <IconPhoto size={20} />
            </Avatar>
            <Stack gap={2}>
              <Text fw={600}>Company Logo</Text>
              <Text size="sm" c="dimmed">SVG, PNG, JPG up to {MAX_MB}MB</Text>
            </Stack>
          </Group>
          {preview && <Badge color="green" variant="light" leftSection={<IconCheck size={12} />}>Active</Badge>}
        </Group>

        {canEdit && (
          <Group align="center" gap="sm" wrap="wrap">
            <FileInput
              value={file}
              onChange={(f) => setFile(f)}
              accept={ACCEPT.join(',')}
              placeholder="Choose logo file"
              leftSection={<IconPhoto size={16} />}
              style={{ minWidth: 280 }}
            />
            <Button onClick={handleUpload} leftSection={<IconUpload size={16} />} loading={isUploading} disabled={!file}>
              Upload Logo
            </Button>
          </Group>
        )}

        {preview && (
          <Box>
            <Image src={preview} alt="Logo Preview" h={60} fit="contain" maw={260} radius={8} />
          </Box>
        )}
      </Stack>
    </Card>
  )
}

