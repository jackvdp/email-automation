// app/components/EmailSender.tsx

"use client";

import React, { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { AlertCircle, Upload, Send, LogIn, LogOut } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/theme-toggle";

const EmailSender = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvPreview, setCsvPreview] = useState<CsvRow[]>([]);
    const [csvData, setCsvData] = useState<CsvRow[]>([]);
    const [subject, setSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [sending, setSending] = useState(false);

    type CsvRow = {
        [key: string]: string | undefined;
    };

    useEffect(() => {
        // Check if user is authenticated
        const checkAuth = async () => {
            try {
                const response = await fetch("/api/auth/check");
                const data = await response.json();
                setIsAuthenticated(data.isAuthenticated);
            } catch (error) {
                console.error("Auth check failed:", error);
            }
        };
        checkAuth();
    }, []);

    const handleSignIn = () => {
        window.location.href = "/api/auth/login";
    };

    const handleFileUpload = (
        event: React.ChangeEvent<HTMLInputElement>
    ): void => {
        const file = event.target.files?.[0];
        if (file) {
            setCsvFile(file);
            const reader = new FileReader();

            reader.onload = (e: ProgressEvent<FileReader>): void => {
                const text = e.target?.result;
                if (typeof text === "string") {
                    const rows = text.split("\n").filter((row) => row.trim() !== "");
                    const headers = rows[0].split(",");

                    // Store full data
                    const fullData: CsvRow[] = rows.slice(1).map((row) => {
                        const values = row.split(",");
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
            const sanitizedEmailBody = emailBody;

            const response = await fetch("/api/send-emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    subject,
                    emailBody: sanitizedEmailBody,
                    recipients: csvData,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Emails Sent Successfully",
                    description: `Successfully sent: ${data.results.successful.length} emails\nFailed: ${data.results.failed.length} emails`,
                    variant: "default",
                });

                if (data.results.failed.length > 0) {
                    console.log("Failed emails:", data.results.failed);
                }
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            toast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to send emails",
                variant: "destructive",
            });
        } finally {
            setSending(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="max-w-4xl mx-auto p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Authentication Required</CardTitle>
                        <CardDescription>
                            Please sign in with Microsoft to send emails
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleSignIn} className="w-full">
                            <LogIn className="w-4 h-4 mr-2" />
                            Sign in with Microsoft
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Mail Merge Sender</CardTitle>
                            <CardDescription>
                                Upload your CSV, customize your email, and send to multiple
                                recipients
                            </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                            <ThemeToggle />
                            <Button
                                variant="outline"
                                onClick={() => window.location.href = "/api/auth/logout"}
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* CSV Upload Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">1. Upload Recipients CSV</h3>
                        <Alert className="bg-secondary">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>CSV Format Required</AlertTitle>
                            <AlertDescription>
                                Your CSV should include columns: email, first_name, and any
                                other custom fields you want to use in your template. Use
                                {" ${field_name} "} in your email to insert these values.
                            </AlertDescription>
                        </Alert>
                        <div className="flex items-center space-x-4">
                            <Input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className=""
                            />
                            <Upload className="h-5 w-5 text-gray-500" />
                        </div>

                        {csvPreview.length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-medium mb-2">Preview (first 3 rows):</h4>
                                <div className="overflow-auto rounded-md border border-gray-200 dark:border-gray-700">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-800">
                                            <tr>
                                                {Object.keys(csvPreview[0]).map((header) => (
                                                    <th
                                                        key={header}
                                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                                                    >
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                            {csvPreview.map((row, rowIndex) => (
                                                <tr key={rowIndex}>
                                                    {Object.values(row).map((value, cellIndex) => (
                                                        <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                            {value}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                    Total Rows: {csvData.length}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Email Template Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">2. Compose Email</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Subject Line
                                </label>
                                <Input
                                    placeholder="Enter subject line (you can use ${first_name} etc.)"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Email Body
                                </label>
                                <ReactQuill
                                    theme="snow"
                                    value={emailBody}
                                    onChange={setEmailBody}
                                    placeholder="Compose your email here (you can use ${first_name} etc.)"
                                    modules={{
                                        toolbar: [
                                            [{ header: [1, 2, false] }],
                                            ["bold", "italic", "underline", "strike", "blockquote"],
                                            [{ list: "ordered" }, { list: "bullet" }],
                                            ["link", "image"],
                                            ["color", "background"],
                                            ["clean"],
                                        ],
                                    }}
                                    formats={[
                                        "header",
                                        "bold",
                                        "italic",
                                        "underline",
                                        "strike",
                                        "blockquote",
                                        "list",
                                        "bullet",
                                        "link",
                                        "image",
                                        "color",
                                        "background",
                                    ]}
                                    className="bg-white text-black"
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