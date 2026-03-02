import { uploadResume } from '../services/api';

// TODO: Drag-and-drop resume upload component
// Calls POST /api/candidates/upload, shows parsed info + match score result
export default function ResumeUpload({ onParsed }) {
    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await uploadResume(formData);
            if (onParsed) onParsed(res.data);
        } catch (err) {
            console.error('Upload failed:', err);
        }
    };

    return (
        <div>
            <input type="file" accept=".pdf,.docx" onChange={handleUpload} />
        </div>
    );
}
