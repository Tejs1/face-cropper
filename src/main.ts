import "./style.css"
import "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest"
import blazeface from "https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@latest"
const upload = document.getElementById("upload") as HTMLInputElement
const canvas = document.getElementById("canvas")
const ctx = (canvas as HTMLCanvasElement).getContext("2d")
const loading = document.getElementById("loading")
const imageContainer = document.getElementById("image-container")

upload.addEventListener("change", async event => {
	// Show loading state
	if (loading) {
		loading.style.display = "block"
	}
	if (canvas) {
		canvas.style.display = "none"
	}

	const file = event.target.files[0]
	const img = new Image()
	img.src = URL.createObjectURL(file)

	img.onload = async () => {
		canvas.width = img.width
		canvas.height = img.height
		ctx.drawImage(img, 0, 0)

		// Load face detection model
		const model = await blazeface.load()

		// Perform face detection
		const predictions = await model.estimateFaces(canvas, false)

		if (predictions.length > 0) {
			const face = predictions[0]
			const { topLeft, bottomRight } = face
			const faceWidth = bottomRight[0] - topLeft[0]
			const faceHeight = bottomRight[1] - topLeft[1]

			// Calculate the center of the face
			const faceCenterX = (topLeft[0] + bottomRight[0]) / 2
			const faceCenterY = (topLeft[1] + bottomRight[1]) / 2

			// Calculate crop size such that face occupies 60% of the square
			const faceSize = Math.max(faceWidth, faceHeight)
			const cropSize = faceSize / 0.6 // Ensure the face occupies 60% of the square

			// Calculate the top-left corner of the crop area to center the face
			const cropX = Math.max(0, faceCenterX - cropSize / 2)
			const cropY = Math.max(0, faceCenterY - cropSize / 2)

			// Ensure the crop area stays within the image boundaries
			const cropXAdjusted = Math.min(cropX, img.width - cropSize)
			const cropYAdjusted = Math.min(cropY, img.height - cropSize)

			// Crop the image
			const croppedImage = ctx.getImageData(
				cropXAdjusted,
				cropYAdjusted,
				cropSize,
				cropSize,
			)

			// Resize the canvas to the square dimensions
			canvas.width = cropSize
			canvas.height = cropSize
			ctx.putImageData(croppedImage, 0, 0)

			// Adjust canvas to fit within container
			canvas.style.width = "100%"
			canvas.style.height = "100%"

			// Hide loading state and show the canvas
			loading.style.display = "none"
			canvas.style.display = "block"
		} else {
			// Hide loading state if no face is detected
			loading.textContent = "No face detected. Please upload another image."
		}
	}
})
