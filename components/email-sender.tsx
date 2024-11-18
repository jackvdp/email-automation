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
import QuillWrapper from "./quil-wrapper";
import "react-quill/dist/quill.snow.css";
import { AlertCircle, Upload, Send, LogIn, LogOut, Plus, Minus, TestTube2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/theme-toggle";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function EmailSender() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvPreview, setCsvPreview] = useState<CsvRow[]>([]);
    const [csvData, setCsvData] = useState<CsvRow[]>([]);
    const [subject, setSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [sending, setSending] = useState(false);
    const [testEmail, setTestEmail] = useState("");
    const [isTesting, setIsTesting] = useState(false);
    const [showCC, setShowCC] = useState(false);
    const [cc, setCC] = useState("");
    const [showBCC, setShowBCC] = useState(false);
    const [bcc, setBCC] = useState("");

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
                    cc: showCC ? cc : undefined,
                    bcc: showBCC ? bcc : undefined,
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

    const handleSendTestEmail = async () => {
        if (!csvData.length) {
            toast({
                title: "No recipients available",
                description: "Please upload a CSV with at least one recipient.",
                variant: "destructive",
            });
            return;
        }

        if (!testEmail) {
            toast({
                title: "Test Email Required",
                description: "Please enter an email address to send the test email.",
                variant: "destructive",
            });
            return;
        }

        setIsTesting(true);
        try {
            const firstRow = { ...csvData[0], email: testEmail };

            const response = await fetch("/api/send-emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    subject,
                    emailBody,
                    recipients: [firstRow],
                    cc: showCC ? cc : undefined,
                    bcc: showBCC ? bcc : undefined,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Test Email Sent Successfully",
                    description: `Successfully sent a test email to ${testEmail}`,
                    variant: "default",
                });
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            toast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to send test email",
                variant: "destructive",
            });
        } finally {
            setIsTesting(false);
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
                                                        <td
                                                            key={cellIndex}
                                                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                                                        >
                                                            {value}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
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
                                <QuillWrapper value={emailBody} onChange={setEmailBody} />
                            </div>

                            {/* CC and BCC Toggle Section */}
                            <div className="space-y-2">
                                {/* CC Field */}
                                <div className="flex items-center space-x-2">
                                    {showCC ? (
                                        <>
                                            <Input
                                                type="email"
                                                placeholder="Enter CC email address"
                                                value={cc}
                                                onChange={(e) => setCC(e.target.value)}
                                                className="flex-1"
                                            />
                                            <Button
                                                variant="ghost"
                                                onClick={() => setShowCC(false)}
                                                size="icon"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            onClick={() => setShowCC(true)}
                                            size="sm"
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Add CC
                                        </Button>
                                    )}
                                </div>

                                {/* BCC Field */}
                                <div className="flex items-center space-x-2">
                                    {showBCC ? (
                                        <>
                                            <Input
                                                type="email"
                                                placeholder="Enter BCC email address"
                                                value={bcc}
                                                onChange={(e) => setBCC(e.target.value)}
                                                className="flex-1"
                                            />
                                            <Button
                                                variant="ghost"
                                                onClick={() => setShowBCC(false)}
                                                size="icon"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            onClick={() => setShowBCC(true)}
                                            size="sm"
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Add BCC
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Send Buttons Section */}
                    <div className="flex space-x-4 justify-end">
                        {/* Send Test Email Button */}
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button
                                    variant="secondary"
                                    disabled={!csvData.length || sending}
                                    className="w-32"
                                >
                                    <TestTube2 className="w-4 h-4 mr-2" />
                                    Send Test
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Send Test Email</DialogTitle>
                                    <DialogDescription>
                                        Enter an email address to send a test email. This helps you verify the email formatting and content before sending it to all recipients.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <Input
                                        type="email"
                                        placeholder="Enter test email address"
                                        value={testEmail}
                                        onChange={(e) => setTestEmail(e.target.value)}
                                        className=""
                                    />
                                </div>
                                <DialogFooter>
                                    <Button
                                        onClick={handleSendTestEmail}
                                        disabled={!testEmail || isTesting}
                                    >
                                        {isTesting ? "Sending..." : "Send Test"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Send Emails Button */}
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
