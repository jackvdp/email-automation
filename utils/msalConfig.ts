// utils/msalConfig.ts
const msalConfig = {
    auth: {
        clientId: process.env.AZURE_CLIENT_ID!,
        clientSecret: process.env.AZURE_CLIENT_SECRET!,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`
    }
};

export default msalConfig;