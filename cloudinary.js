import dotenv from "dotenv";
import cloudinary from "cloudinary";

dotenv.config();

const cloudinaryV2 = cloudinary.v2;

cloudinaryV2.config({
//   cloud_name: process.env.CLOUD_NAME,
//   api_key: process.env.API_KEY,
//   api_secret: process.env.API_SECRET,
  secure: true,
});

// console.log(cloudinaryV2.config());

export const imageUploadFunction = async (imagePath) => {
  try {
    const result = await cloudinaryV2.uploader.upload(imagePath);
    //console.log(result.secure_url);
    return result;
  } catch (error) {
    console.error("Error uploading image:", error);
  }
};

/* Upload buffers and streams*/
export const imageUploadFunctionModifiedToUseBuffers = async (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinaryV2.uploader.upload_stream(
      { folder: "Spotly user avatars" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};
