import { createClient } from "@/lib/supabase/client";

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

interface UploadIncidentImagesOptions {
  files: File[];
  incidentId: string;
  universityId: string;
  userId: string;
  imageType: "evidence" | "resolution";
}

export async function uploadIncidentImages({
  files,
  incidentId,
  universityId,
  userId,
  imageType,
}: UploadIncidentImagesOptions): Promise<string | null> {
  if (files.length === 0) return null;

  const supabase = createClient();
  if (!supabase) return "Photo storage is unavailable. Please try again later.";

  const bucket = supabase.storage.from("incident-evidence");
  const uploadedPaths: string[] = [];
  const imageRows: Array<{
    incident_id: string;
    university_id: string;
    uploaded_by: string;
    storage_path: string;
    public_url: string;
    image_type: "evidence" | "resolution";
    mime_type: string;
    file_size_bytes: number;
  }> = [];
  let completed = false;

  try {
    for (const file of files) {
      const path = `${universityId}/${userId}/${incidentId}/${crypto.randomUUID()}.${IMAGE_EXTENSIONS[file.type]}`;
      const { error: uploadError } = await bucket.upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) {
        console.error("Incident image upload failed:", uploadError);
        return "One or more photos could not be uploaded.";
      }
      uploadedPaths.push(path);

      const { data: signedUrl, error: signedUrlError } = await bucket.createSignedUrl(path, 60 * 60);
      if (signedUrlError || !signedUrl) {
        console.error("Incident image URL creation failed:", signedUrlError ?? "No URL returned.");
        return "Photo upload completed, but its secure image record could not be prepared.";
      }

      imageRows.push({
        incident_id: incidentId,
        university_id: universityId,
        uploaded_by: userId,
        storage_path: path,
        public_url: signedUrl.signedUrl,
        image_type: imageType,
        mime_type: file.type,
        file_size_bytes: file.size,
      });
    }

    const { error: metadataError } = await supabase.from("incident_images").insert(imageRows);
    if (metadataError) {
      console.error("Incident image metadata insert failed:", metadataError);
      return "Photos were uploaded, but CampusFix could not attach them to the report.";
    }

    completed = true;
    return null;
  } finally {
    if (!completed && uploadedPaths.length > 0) {
      try {
        const { error: cleanupError } = await bucket.remove(uploadedPaths);
        if (cleanupError) {
          console.error("Incident image cleanup failed:", cleanupError);
        }
      } catch (cleanupError) {
        console.error("Incident image cleanup failed:", cleanupError);
      }
    }
  }
}
