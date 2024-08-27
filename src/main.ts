import * as blazeface from "@tensorflow-models/blazeface"
import "@tensorflow/tfjs"
let model: blazeface.BlazeFaceModel
const TARGET_FACE_PERCENT = 0.7
const PADDING_PERCENT = 0.1

async function loadModel(
	statusElement: HTMLElement,
	uploadButton: HTMLButtonElement,
) {
	try {
		model = await blazeface.load()

		statusElement.textContent =
			"Face detection model loaded. Ready to process images."
		uploadButton.disabled = false
	} catch (error) {
		console.error("Error loading BlazeFace model:", error)
		statusElement.textContent = `Error loading model: ${error.message}. Please reload the page.`
	}
}

async function detectFace(img: HTMLImageElement) {
	const predictions = await model.estimateFaces(img, false)
	if (predictions.length > 0) {
		return predictions[0]
	}
	return null
}

function calculateCropArea(
	face: blazeface.NormalizedFace | blazeface.NormalizedFace[],
	imgWidth: number,
	imgHeight: number,
) {
	if (Array.isArray(face)) {
		face = face[0]
	}
	console.log(face)
	let bottomright1: number,
		bottomright2: number,
		topLeft1: number,
		topLeft2: number

	const bottomRightArray = Array.isArray(face.bottomRight)
		? face.bottomRight
		: Array.from(face.bottomRight.dataSync())
	if (Array.isArray(bottomRightArray)) {
		;[bottomright1, bottomright2] = bottomRightArray
	} else {
		bottomright1 = bottomRightArray[0]
		bottomright2 = bottomRightArray[1]
	}
	const topLeftArray = Array.isArray(face.topLeft)
		? face.topLeft
		: Array.from(face.topLeft.dataSync())
	if (Array.isArray(topLeftArray)) {
		;[topLeft1, topLeft2] = topLeftArray
	} else {
		topLeft1 = topLeftArray[0]
		topLeft2 = topLeftArray[1]
	}

	const faceWidth = bottomright1 - topLeft1
	const faceHeight = bottomright2 - topLeft2
	const faceCenterX = (topLeft1 + bottomright1) / 2
	const faceCenterY = (topLeft2 + bottomright2) / 2

	const baseCropSize = Math.max(faceWidth, faceHeight) / TARGET_FACE_PERCENT
	const cropSize = baseCropSize * (1 + PADDING_PERCENT)

	let sourceX = faceCenterX - cropSize / 2
	let sourceY = faceCenterY - cropSize / 2

	sourceX = Math.max(0, Math.min(sourceX, imgWidth - cropSize))
	sourceY = Math.max(0, Math.min(sourceY, imgHeight - cropSize))

	return { sourceX, sourceY, cropSize }
}

function drawBoundingBoxes(
	img: HTMLImageElement,
	face: blazeface.NormalizedFace,
	cropArea: { sourceX: any; sourceY: any; cropSize: any },
) {
	const canvas = document.getElementById(
		"originalImageCanvas",
	) as HTMLCanvasElement
	const ctx = canvas?.getContext("2d")
	if (!ctx) return

	canvas.width = img.width
	canvas.height = img.height

	ctx.drawImage(img, 0, 0, img.width, img.height)

	// Draw crop bounding box (green)
	ctx.strokeStyle = "green"
	ctx.lineWidth = 3
	ctx.strokeRect(
		cropArea.sourceX,
		cropArea.sourceY,
		cropArea.cropSize,
		cropArea.cropSize,
	)

	// Draw adjusted face bounding box (blue)
	const faceSize = cropArea.cropSize * TARGET_FACE_PERCENT
	const faceX = cropArea.sourceX + (cropArea.cropSize - faceSize) / 2
	const faceY = cropArea.sourceY + (cropArea.cropSize - faceSize) / 2

	ctx.strokeStyle = "blue"
	ctx.lineWidth = 3
	ctx.strokeRect(faceX, faceY, faceSize, faceSize)

	// Draw model-detected face bounding box (red)
	ctx.strokeStyle = "red"
	ctx.lineWidth = 2
	ctx.strokeRect(
		face.topLeft[0],
		face.topLeft[1],
		face.bottomRight[0] - face.topLeft[0],
		face.bottomRight[1] - face.topLeft[1],
	)
}

function cropImage(
	img: CanvasImageSource,
	cropArea: { sourceX: any; sourceY: any; cropSize: any },
) {
	const canvas = document.createElement("canvas")
	const ctx = canvas.getContext("2d")

	canvas.width = cropArea.cropSize
	canvas.height = cropArea.cropSize

	if (ctx) {
		ctx.drawImage(
			img,
			cropArea.sourceX,
			cropArea.sourceY,
			cropArea.cropSize,
			cropArea.cropSize,
			0,
			0,
			cropArea.cropSize,
			cropArea.cropSize,
		)

		return canvas.toDataURL()
	}
}

document.addEventListener("DOMContentLoaded", () => {
	const fileInput = document.getElementById("fileInput")
	const uploadButton = document.getElementById("uploadButton")
	const croppedImage = document.getElementById(
		"croppedImage",
	) as HTMLImageElement
	const statusElement = document.getElementById("status")
	if (!fileInput || !uploadButton || !croppedImage || !statusElement) return

	uploadButton.addEventListener("click", () => fileInput.click())

	loadModel(statusElement, uploadButton as HTMLButtonElement)

	fileInput.addEventListener("change", async e => {
		if (!e.target) return
		const fileInput = e.target as HTMLInputElement
		const files = fileInput.files
		if (!files || files.length === 0) return
		const file = files[0]

		try {
			const img = new Image()
			img.onload = async () => {
				const face = await detectFace(img)
				if (face) {
					const cropArea = calculateCropArea(face, img.width, img.height)
					drawBoundingBoxes(img, face, cropArea)
					const croppedImageUrl = cropImage(img, cropArea)
					if (croppedImageUrl) {
						croppedImage.src = croppedImageUrl
					}
					statusElement.textContent = "Image processed successfully."
				} else {
					statusElement.textContent = "No face detected in the image."
				}
			}
			img.src = URL.createObjectURL(file)
		} catch (error) {
			console.error("Error processing image:", error)
			statusElement.textContent = `Error processing image: ${error.message}. Please try again.`
		}
	})
})
