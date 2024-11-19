const prepareAndSendEmail = async ({
    subject,
    emailBody,
    recipients,
    cc,
    bcc,
    attachments,
    isTest = false
}: {
    subject: string;
    emailBody: string;
    recipients: any[];
    cc?: string;
    bcc?: string;
    attachments: File[];
    isTest?: boolean;
}) => {
    const uploadedAttachments = await Promise.all(
        attachments.map(async (file) => {
            const buffer = await file.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            return {
                '@odata.type': '#microsoft.graph.fileAttachment',
                name: file.name,
                contentType: file.type,
                contentBytes: base64
            };
        })
    );

    const response = await fetch("/api/send-emails", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            subject,
            emailBody,
            recipients,
            cc,
            bcc,
            attachments: uploadedAttachments
        }),
    });

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error);
    }

    return data;
};

export default prepareAndSendEmail;