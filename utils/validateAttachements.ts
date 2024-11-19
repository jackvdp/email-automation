const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;
const MAX_TOTAL_SIZE = 35 * 1024 * 1024;
const MAX_ATTACHMENTS = 250;

const validateAttachments = (files: File[]) => {
    if (files.length > MAX_ATTACHMENTS) {
        throw new Error(`Maximum ${MAX_ATTACHMENTS} attachments allowed`);
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
        throw new Error(`Total attachments size exceeds ${MAX_TOTAL_SIZE / (1024 * 1024)}MB`);
    }

    files.forEach(file => {
        if (file.size > MAX_ATTACHMENT_SIZE) {
            throw new Error(`File ${file.name} exceeds ${MAX_ATTACHMENT_SIZE / (1024 * 1024)}MB`);
        }
    });
};

export default validateAttachments;