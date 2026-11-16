/**
 * Utility for client-side video inspection, trimming and optimization.
 * If a video exceeds allowed duration (default: 12s) or file size (default: 20MB),
 * rather than failing, it automatically renders and records the first N seconds
 * into an optimized, lightweight canvas stream (720p @ ~2Mbps) so the upload never fails.
 */

export interface ProcessVideoResult {
    file: File | Blob
    fileName: string
    wasTrimmed: boolean
    originalDuration: number
    finalDuration: number
}

export async function processVideoForUpload(
    file: File,
    onProgress?: (message: string) => void,
    maxDurationSeconds: number = 12
): Promise<ProcessVideoResult> {
    const isVideo = file.type.startsWith('video/')
    if (!isVideo) {
        return {
            file,
            fileName: file.name,
            wasTrimmed: false,
            originalDuration: 0,
            finalDuration: 0
        }
    }

    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.src = objectUrl
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'

    // Load metadata to check duration
    await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => {
            URL.revokeObjectURL(objectUrl)
            // If browser can't parse metadata, fallback to original file
            resolve()
        }
    })

    const duration = video.duration || 0
    const MAX_BYTES = 20 * 1024 * 1024 // 20 MB

    // If within limits and small enough, keep original
    if (duration > 0 && duration <= maxDurationSeconds && file.size <= MAX_BYTES) {
        URL.revokeObjectURL(objectUrl)
        return {
            file,
            fileName: file.name,
            wasTrimmed: false,
            originalDuration: duration,
            finalDuration: duration
        }
    }

    onProgress?.(`Ajustando video: recortando automáticamente a los primeros ${maxDurationSeconds} segundos...`)

    // Client-side trimming via Canvas + MediaRecorder
    try {
        const hasCaptureStream = typeof HTMLCanvasElement.prototype.captureStream === 'function'
        const hasMediaRecorder = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined'

        if (!hasCaptureStream || !hasMediaRecorder || duration <= 0) {
            URL.revokeObjectURL(objectUrl)
            return {
                file,
                fileName: file.name,
                wasTrimmed: false,
                originalDuration: duration,
                finalDuration: duration
            }
        }

        // Determine resolution: max width 720 (standard vertical reel)
        let targetWidth = video.videoWidth || 720
        let targetHeight = video.videoHeight || 1280
        const maxWidth = 720
        if (targetWidth > maxWidth) {
            const ratio = maxWidth / targetWidth
            targetWidth = Math.round(targetWidth * ratio)
            targetHeight = Math.round(targetHeight * ratio)
        }

        // Canvas dimensions must be even numbers for most codecs
        if (targetWidth % 2 !== 0) targetWidth -= 1
        if (targetHeight % 2 !== 0) targetHeight -= 1

        const canvas = document.createElement('canvas')
        canvas.width = targetWidth
        canvas.height = targetHeight
        const ctx = canvas.getContext('2d')

        if (!ctx) {
            URL.revokeObjectURL(objectUrl)
            return {
                file,
                fileName: file.name,
                wasTrimmed: false,
                originalDuration: duration,
                finalDuration: duration
            }
        }

        const stream = canvas.captureStream(30) // 30 FPS

        // Pick supported mime type
        let mimeType = 'video/webm'
        if (typeof MediaRecorder.isTypeSupported === 'function') {
            if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
                mimeType = 'video/mp4;codecs=avc1'
            } else if (MediaRecorder.isTypeSupported('video/mp4')) {
                mimeType = 'video/mp4'
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                mimeType = 'video/webm;codecs=vp9'
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
                mimeType = 'video/webm;codecs=vp8'
            }
        }

        const recorder = new MediaRecorder(stream, {
            mimeType: mimeType.split(';')[0],
            videoBitsPerSecond: 1_800_000 // 1.8 Mbps -> 12s is ~2.7 MB
        })

        const recordedChunks: Blob[] = []
        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data)
            }
        }

        const trimPromise = new Promise<Blob>((resolve, reject) => {
            recorder.onstop = () => {
                const finalBlob = new Blob(recordedChunks, { type: mimeType })
                resolve(finalBlob)
            }
            recorder.onerror = (e) => reject(e)
        })

        recorder.start(100)

        // Play video and draw to canvas
        video.currentTime = 0
        await video.play()

        const clipLength = Math.min(maxDurationSeconds, duration)
        let reqId: number

        await new Promise<void>((resolve) => {
            const checkTime = () => {
                if (video.currentTime >= clipLength || video.ended || video.paused) {
                    cancelAnimationFrame(reqId)
                    video.pause()
                    if (recorder.state !== 'inactive') {
                        recorder.stop()
                    }
                    resolve()
                    return
                }
                ctx.drawImage(video, 0, 0, targetWidth, targetHeight)
                reqId = requestAnimationFrame(checkTime)
            }
            reqId = requestAnimationFrame(checkTime)
        })

        const trimmedBlob = await trimPromise
        URL.revokeObjectURL(objectUrl)

        const isMp4 = mimeType.includes('mp4')
        const finalExt = isMp4 ? 'mp4' : 'webm'
        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || 'reel'
        const trimmedFileName = `${baseName}_trimmed_${clipLength}s.${finalExt}`

        const trimmedFile = new File([trimmedBlob], trimmedFileName, {
            type: mimeType
        })

        return {
            file: trimmedFile,
            fileName: trimmedFileName,
            wasTrimmed: true,
            originalDuration: duration,
            finalDuration: clipLength
        }
    } catch (err) {
        console.warn('Auto-trim fallback to original file:', err)
        URL.revokeObjectURL(objectUrl)
        return {
            file,
            fileName: file.name,
            wasTrimmed: false,
            originalDuration: duration,
            finalDuration: duration
        }
    }
}
