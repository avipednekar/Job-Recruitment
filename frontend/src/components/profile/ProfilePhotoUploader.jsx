import { useRef, useState } from "react";
import { Camera, Upload, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../ui/Button";
import { uploadProfilePhoto } from "../../services/api";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ProfilePhotoUploader({
  photoUrl,
  name,
  onUploaded,
  compact = false,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const initials = name?.trim()?.charAt(0)?.toUpperCase() || "U";

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WebP image");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await uploadProfilePhoto(formData);
      onUploaded?.(res.data.photo, res.data.profile);
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to upload profile photo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`flex items-center gap-4 ${compact ? "" : "rounded-2xl border border-border bg-surface-2 p-4"}`}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`${compact ? "size-16 rounded-2xl" : "size-24 rounded-3xl"} group relative grid shrink-0 place-items-center overflow-hidden bg-primary/10 text-primary`}
        aria-label="Upload profile photo"
      >
        {photoUrl ? (
          <img src={photoUrl} alt={name ? `${name} profile` : "Profile"} className="size-full object-cover" />
        ) : compact ? (
          <span className="text-xl font-bold">{initials}</span>
        ) : (
          <UserRound className="size-9" />
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="size-5" />
        </span>
      </button>

      <div className="min-w-0">
        {!compact ? (
          <>
            <p className="text-sm font-semibold text-text-primary">Profile photo</p>
            <p className="mt-1 text-xs text-text-secondary">JPG, PNG, or WebP up to 5 MB.</p>
          </>
        ) : null}
        <div className={compact ? "" : "mt-3"}>
          <Button
            variant="secondary"
            size={compact ? "sm" : "md"}
            onClick={() => inputRef.current?.click()}
            isLoading={uploading}
          >
            <Upload className="size-4" /> {photoUrl ? "Change photo" : "Upload photo"}
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
