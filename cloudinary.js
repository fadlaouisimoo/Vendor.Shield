import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} originalName - Original filename
 * @param {string} folder - Folder path in Cloudinary (optional)
 * @returns {Promise<{url: string, public_id: string}>}
 */
export async function uploadToCloudinary(fileBuffer, originalName, folder = 'vendorshield/proofs') {
	return new Promise((resolve, reject) => {
		// Create a readable stream from buffer
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				folder: folder,
				resource_type: 'auto', // Automatically detect image, video, raw, etc.
				use_filename: true,
				unique_filename: true,
				overwrite: false
			},
			(error, result) => {
				if (error) {
					console.error('Cloudinary upload error:', error);
					return reject(error);
				}
				resolve({
					url: result.secure_url, // Use secure_url for HTTPS
					public_id: result.public_id,
					format: result.format,
					resource_type: result.resource_type
				});
			}
		);

		// Convert buffer to stream and pipe to Cloudinary
		const bufferStream = new Readable();
		bufferStream.push(fileBuffer);
		bufferStream.push(null); // End the stream
		bufferStream.pipe(uploadStream);
	});
}

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - The public_id of the file to delete
 * @returns {Promise}
 */
export async function deleteFromCloudinary(publicId) {
	try {
		const result = await cloudinary.uploader.destroy(publicId);
		return result;
	} catch (error) {
		console.error('Cloudinary delete error:', error);
		throw error;
	}
}

/**
 * Check if Cloudinary is configured
 * @returns {boolean}
 */
export function isCloudinaryConfigured() {
	return !!(
		process.env.CLOUDINARY_CLOUD_NAME &&
		process.env.CLOUDINARY_API_KEY &&
		process.env.CLOUDINARY_API_SECRET
	);
}

export default cloudinary;

