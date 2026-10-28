---
name: file-uploads
description: Implementation guidelines for secure image uploads, file validation, storage drivers, thumbnail generation, and orphaned file cleanup for SocietyClean.
---

# File Uploads Skill (`file-uploads`)

Use this skill when implementing, configuring, or debugging image uploads for incident reports (before photos) and staff task completions (after photos) in SocietyClean.

---

## 1. Storage Architecture & Driver Pattern

All file operations must pass through the `StorageService` interface:

```typescript
export interface StorageService {
  uploadFile(file: Express.Multer.File, subfolder: string): Promise<string>;
  deleteFile(fileUrl: string): Promise<void>;
  getPublicUrl(storedPath: string): string;
}
```

- **Development:** Uses `LocalStorageDriver` storing files on disk at `./uploads/complaints/`.
- **Production:** Uses `S3StorageDriver` uploading directly to AWS S3, Cloudflare R2, or Supabase Storage with bucket-level encryption.

---

## 2. Strict Upload Constraints & Validation

Every uploaded file must pass a 4-tier validation pipeline:

```mermaid
graph LR
    A[Incoming Upload] --> B[1. Size Check <= 5MB]
    B --> C[2. MIME Whitelist]
    C --> D[3. Magic Bytes Inspection]
    D --> E[4. UUID Renaming]
    E --> F[Persisted Storage]
```

1. **Size Limit:** Maximum $5\text{MB}$ ($5,242,880$ bytes). Files exceeding this threshold must be rejected immediately with HTTP 413.
2. **MIME Type Whitelist:**
   - `image/jpeg`
   - `image/png`
   - `image/webp`
   *Reject all other MIME types (`image/svg+xml`, `application/pdf`, executables) with HTTP 415.*
3. **Magic Byte Verification:** Verify file headers using libraries such as `file-type` to detect disguised executables.
4. **Filename Sanitization:** Never keep the client's original file name. Generate a randomized UUID filename:
   ```text
   uploads/complaints/${societyId}/${uuid()}.${extension}
   ```

---

## 3. Upload Failure & Transaction Rollback

If a database transaction fails while creating a complaint, the corresponding uploaded image file must be deleted immediately:

```typescript
try {
  const photoUrl = await storageService.uploadFile(req.file, 'complaints');
  await complaintService.createComplaint({ ...data, photoUrl });
} catch (error) {
  // Rollback file from storage if DB write failed
  if (req.file) {
    await storageService.deleteFile(photoUrl);
  }
  throw error;
}
```

---

## 4. Serving Images & Security Headers

When serving local uploads:
- Mount upload routes with `express.static()` using strict security options:
  - `dotfiles: 'ignore'`
  - `fallthrough: false`
  - Set header `X-Content-Type-Options: nosniff`
  - Set header `Content-Disposition: inline`
- Never place uploaded files inside folders containing executable server scripts (`.js`, `.ts`).

---

## 5. Orphaned Upload Cleanup Job

- Unattached or abandoned temporary files older than 24 hours must be periodically swept and removed by a background maintenance script.
- When a complaint is deleted or purged, its associated `photo_url` and `resolution_photo_url` files must be purged from storage.
