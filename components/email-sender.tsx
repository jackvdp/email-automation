"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Upload, Mail, Send } from 'lucide-react';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import { toast } from "@/hooks/use-toast";

const EmailSender = () => {
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvPreview, setCsvPreview] = useState<CsvRow[]>([]);
    const [csvData, setCsvData] = useState<CsvRow[]>([]);
    const [subject, setSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [sending, setSending] = useState(false);

    type CsvRow = {
        [key: string]: string | undefined;
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const file = event.target.files?.[0];
        if (file) {
            setCsvFile(file);
            const reader = new FileReader();

            reader.onload = (e: ProgressEvent<FileReader>): void => {
                const text = e.target?.result;
                if (typeof text === 'string') {
                    const rows = text.split('\n');
                    const headers = rows[0].split(',');

                    // Store full data
                    const fullData: CsvRow[] = rows.slice(1).map(row => {
                        const values = row.split(',');
                        return headers.reduce<CsvRow>((obj, header, index) => {
                            obj[header.trim()] = values[index]?.trim();
                            return obj;
                        }, {});
                    });
                    setCsvData(fullData);

                    // Store preview
                    setCsvPreview(fullData.slice(0, 3));
                }
            };

            reader.readAsText(file);
        }
    };

    const handleSendEmails = async () => {
        setSending(true);
        try {
            const response = await fetch('/api/send-emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subject,
                    emailBody,
                    recipients: csvData,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: 'Emails Sent Successfully',
                    description: `Successfully sent: ${data.results.successful.length} emails\nFailed: ${data.results.failed.length} emails`,
                    variant: 'default',
                });

                if (data.results.failed.length > 0) {
                    console.log('Failed emails:', data.results.failed);
                }
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to send emails',
                variant: 'destructive',
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Mass Email Sender</CardTitle>
                    <CardDescription>Upload your CSV, customize your email, and send to multiple recipients</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* CSV Upload Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">1. Upload Recipients CSV</h3>
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>CSV Format Required</AlertTitle>
                            <AlertDescription>
                                Your CSV should include columns: email, first_name, and any other custom fields you want to use in your template.
                                Use ${'{'}field_name{'}'} in your email to insert these values.
                            </AlertDescription>
                        </Alert>
                        <div className="flex items-center space-x-4">
                            <Input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="flex-1"
                            />
                            <Upload className="h-5 w-5 text-gray-500" />
                        </div>

                        {csvPreview.length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-medium mb-2">Preview (first 3 rows):</h4>
                                <div className="bg-gray-50 p-4 rounded-md">
                                    <pre className="text-sm overflow-auto">
                                        {JSON.stringify(csvPreview, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Email Template Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">2. Compose Email</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Subject Line</label>
                                <Input
                                    placeholder="Enter subject line (you can use ${first_name} etc.)"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email Body</label>
                                <Textarea
                                    placeholder="Enter email body (you can use ${first_name} etc.)"
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                    rows={8}
                                    className="font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Send Button */}
                    <div className="flex justify-end">
                        <Button
                            onClick={handleSendEmails}
                            disabled={!csvFile || !subject || !emailBody || sending}
                            className="w-32"
                        >
                            {sending ? (
                                "Sending..."
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Send Emails
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default EmailSender;