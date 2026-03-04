import { useState, useRef } from 'react'
import Image from 'next/image'

interface FileUploadProps {
  onUpload: (file: File) => Promise<string>  // 返回文件URL
  accept?: string  // 文件类型
  maxSize?: number  // 最大文件大小（MB）
  label?: string
  disabled?: boolean
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  accept = 'image/*,video/*,audio/*',
  maxSize = 100,
  label = '上传文件',
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 重置状态
    setError(null)
    setProgress(0)
    setUploadedUrl(null)

    // 检查文件大小
    if (file.size > maxSize * 1024 * 1024) {
      setError(`文件大小不能超过 ${maxSize}MB`)
      return
    }

    // 预览图片
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }

    // 上传文件
    setUploading(true)
    try {
      const url = await onUpload(file)
      setUploadedUrl(url)
      setProgress(100)
    } catch (error: any) {
      setError(error.message || '上传失败，请重试')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  const handleRemove = () => {
    setPreview(null)
    setUploadedUrl(null)
    setError(null)
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {!preview && !uploadedUrl && (
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || uploading}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="text-4xl mb-2">📁</div>
          <div className="text-gray-600 font-medium mb-1">{label}</div>
          <div className="text-sm text-gray-500">
            支持图片、视频、音频，最大 {maxSize}MB
          </div>
        </button>
      )}

      {preview && (
        <div className="relative mt-4">
          <Image 
            src={preview}
            alt="Preview"
            width={400}
            height={256}
            className="object-contain rounded-lg border border-gray-200 w-full h-64"
            unoptimized
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <div className="text-white text-center">
                <div className="text-sm mb-2">上传中... {progress}%</div>
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          {uploadedUrl && !uploading && (
            <div className="absolute top-2 right-2">
              <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs">
                ✓ 上传成功
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 left-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs hover:bg-red-600"
          >
            删除
          </button>
        </div>
      )}

      {error && (
        <div className="mt-2 text-red-600 text-sm">{error}</div>
      )}

      {uploadedUrl && (
        <div className="mt-2 text-green-600 text-sm">
          文件已上传: {uploadedUrl.substring(0, 50)}...
        </div>
      )}
    </div>
  )
}

