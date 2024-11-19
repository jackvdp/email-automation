"use client";

import React, { useState } from "react";
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
import { AlertCircle, Upload, Send, LogOut, Plus, Minus, TestTube2, Trash2 } from "lucide-react";
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
import validateAttachments from "@/utils/validateAttachements";
import CsvRow from "@/types/csv";
import prepareAndSendEmail from "@/utils/prepareAndSendEmail";

export default function EmailSender() {
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
    const [attachments, setAttachments] = useState<File[]>([]);
    const [demoDialogOpen, setDemoDialogOpen] = useState(false);
    const [openClear, setOpenClear] = useState(false);

    const handleAttachmentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        try {
            validateAttachments([...attachments, ...files]);
            setAttachments(prev => [...prev, ...files]);
        } catch (error) {
            toast({
                title: "Attachment Error",
                description: error instanceof Error ? error.message : "Failed to add attachments",
                variant: "destructive",
            });
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
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
            const data = await prepareAndSendEmail({
                subject,
                emailBody,
                recipients: csvData,
                cc: showCC ? cc : undefined,
                bcc: showBCC ? bcc : undefined,
                attachments
            });

            toast({
                title: "Emails Sent Successfully",
                description: `Successfully sent: ${data.results.successful.length} emails\nFailed: ${data.results.failed.length} emails`,
                variant: "default",
            });

            if (data.results.failed.length > 0) {
                console.log("Failed emails:", data.results.failed);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to send emails",
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
            await prepareAndSendEmail({
                subject,
                emailBody,
                recipients: [firstRow],
                cc: showCC ? cc : undefined,
                bcc: showBCC ? bcc : undefined,
                attachments,
                isTest: true
            });

            toast({
                title: "Test Email Sent Successfully",
                description: `Successfully sent a test email to ${testEmail}`,
                variant: "default",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to send test email",
                variant: "destructive",
            });
        } finally {
            setIsTesting(false);
        }
    };

    const enableDemoMode = async () => {
        try {
            // Load sample CSV
            const response = await fetch('/data/sample.csv');
            const csvText = await response.text();
            const file = new File([csvText], 'sample.csv', { type: 'text/csv' });

            // Set CSV data
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result;
                if (typeof text === "string") {
                    const rows = text.split("\n").filter(row => row.trim() !== "");
                    const headers = rows[0].split(",");
                    const fullData = rows.slice(1).map(row => {
                        const values = row.split(",");
                        return headers.reduce((obj, header, index) => ({
                            ...obj,
                            [header.trim()]: values[index]?.trim()
                        }), {});
                    });
                    setCsvData(fullData);
                    setCsvPreview(fullData.slice(0, 3));
                    setCsvFile(file);
                }
            };
            reader.readAsText(file);

            // Set email content
            setSubject("Special Offer for ${first_name} from ${company}");
            setEmailBody(`Dear \${first_name},

                We noticed you've been with \${company} for a while now, and we wanted to offer you something special. As a \${role}, we think you'll be particularly interested in this opportunity.
                
                Best regards,
                The Team`);

            // Set CC
            setShowCC(true);
            setCC("test@test.com");
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load demo data",
                variant: "destructive",
            });
        }
    };

    const clearAllData = () => {
        setCsvFile(null);
        setCsvPreview([]);
        setCsvData([]);
        setSubject("");
        setEmailBody("");
        setTestEmail("");
        setShowCC(false);
        setCC("");
        setShowBCC(false);
        setBCC("");
        setAttachments([]);
    };

    function anyDataInputed(): boolean {
        return !!csvFile || subject !== "" || emailBody !== "" || !!testEmail || !!cc || !!bcc || attachments.length > 0;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">


            <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                Mail Merge Sender
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {
                            (anyDataInputed()) && (
                                <Dialog open={openClear} onOpenChange={setOpenClear}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" className="gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Clear Data
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Clear All Data?</DialogTitle>
                                    <DialogDescription>
                                        <div className="space-y-2">
                                            <p>This will remove all data including:</p>
                                            <ul className="list-disc pl-4">
                                                <li>CSV data</li>
                                                <li>Email content</li>
                                                <li>Attachments</li>
                                                <li>CC/BCC recipients</li>
                                            </ul>
                                        </div>
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setOpenClear(false)}>Cancel</Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            clearAllData();
                                            setOpenClear(false);
                                        }}
                                    >
                                        Clear All
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                            )
                        }
                        <Dialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" className="gap-2" onClick={() => setDemoDialogOpen(true)}>
                                    <TestTube2 className="h-4 w-4" />
                                    Demo
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Apply Demo Data?</DialogTitle>
                                    <DialogDescription>
                                        <div className="space-y-2">
                                            <p>This will populate the form with sample data so you can demonstrate the application's functionality.</p>
                                            <p>After press the "Send Test" button at the bottom to send a test email to yourself.</p>
                                        </div>
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button onClick={() => {
                                        enableDemoMode();
                                        setDemoDialogOpen(false);
                                    }}>Apply Demo Data</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <ThemeToggle />
                        <Button
                            variant="outline"
                            onClick={() => window.location.href = "/api/auth/logout"}
                            className="gap-2 hover:bg-secondary"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </div>

            <Card className="max-w-5xl mx-auto shadow-lg my-8">
                <CardContent className="space-y-8 p-6">
                    {/* Upload Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-1 bg-primary rounded-full" />
                            <h3 className="text-xl font-semibold">1. Upload Recipients</h3>
                        </div>

                        <Alert className="bg-secondary/50 border-secondary">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>CSV Format Required</AlertTitle>
                            <AlertDescription>
                                Include columns: email, first_name, and custom fields.
                                Use ${"{field_name}"} to insert values in your template.
                            </AlertDescription>
                        </Alert>

                        <div className="flex items-center gap-4 p-4 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors">
                            <Input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className=""
                            />
                            <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>

                        {csvPreview.length > 0 && (
                            <div className="rounded-lg border bg-card">
                                <div className="p-4 border-b">
                                    <h4 className="font-medium">Preview</h4>
                                    <p className="text-sm text-muted-foreground">First 3 rows of {csvData.length} total records</p>
                                </div>
                                <div className="overflow-auto max-h-64">
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                {Object.keys(csvPreview[0]).map((header) => (
                                                    <th key={header} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {csvPreview.map((row, rowIndex) => (
                                                <tr key={rowIndex} className="hover:bg-muted/50 transition-colors">
                                                    {Object.values(row).map((value, cellIndex) => (
                                                        <td key={cellIndex} className="px-4 py-3 text-sm">
                                                            {value}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Compose Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-1 bg-primary rounded-full" />
                            <h3 className="text-xl font-semibold">2. Compose Email</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Subject Line</label>
                                <Input
                                    placeholder="Enter subject line (supports ${first_name} etc.)"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="border-2 focus-visible:ring-1"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email Body</label>
                                <div className="border rounded-lg">
                                    <QuillWrapper value={emailBody} onChange={setEmailBody} />
                                </div>
                            </div>

                            {/* CC/BCC Section */}
                            <div className="space-y-3 ">
                                <div className="flex items-center gap-2">
                                    {showCC ? (
                                        <div className="flex-1 flex items-center gap-2">
                                            <Input
                                                type="email"
                                                placeholder="CC email address"
                                                value={cc}
                                                onChange={(e) => setCC(e.target.value)}
                                                className="border-2"
                                            />
                                            <Button
                                                variant="ghost"
                                                onClick={() => setShowCC(false)}
                                                size="icon"
                                                className="shrink-0"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            onClick={() => setShowCC(true)}
                                            size="sm"
                                            className="gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add CC
                                        </Button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {showBCC ? (
                                        <div className="flex-1 flex items-center gap-2">
                                            <Input
                                                type="email"
                                                placeholder="BCC email address"
                                                value={bcc}
                                                onChange={(e) => setBCC(e.target.value)}
                                                className="border-2"
                                            />
                                            <Button
                                                variant="ghost"
                                                onClick={() => setShowBCC(false)}
                                                size="icon"
                                                className="shrink-0"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            onClick={() => setShowBCC(true)}
                                            size="sm"
                                            className="gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add BCC
                                        </Button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Attachments</label>
                                    <Input
                                        type="file"
                                        multiple
                                        onChange={handleAttachmentUpload}
                                        className="border-2"
                                    />
                                    {attachments.length > 0 && (
                                        <div className="space-y-2">
                                            {attachments.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between p-2 bg-secondary/20 rounded">
                                                    <span className="text-sm">{file.name} ({(file.size / (1024 * 1024)).toFixed(2)}MB)</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeAttachment(index)}
                                                        className="h-8 w-8"
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Action Buttons */}
                    <div className="flex justify-end items-center gap-4 pt-4">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button
                                    variant="secondary"
                                    disabled={!csvData.length || sending}
                                    className="min-w-[140px] gap-2"
                                >
                                    <TestTube2 className="w-4 h-4" />
                                    Send Test
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Send Test Email</DialogTitle>
                                    <DialogDescription>
                                        <div className="space-y-2">
                                            <p>Verify your email formatting and content before sending to all recipients.</p>
                                            <p>Enter your email below to deliver the test email to yourself.</p>
                                        </div>

                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                    <Input
                                        type="email"
                                        placeholder="Enter test email address"
                                        value={testEmail}
                                        onChange={(e) => setTestEmail(e.target.value)}
                                        className="border-2"
                                    />
                                </div>
                                <DialogFooter>
                                    <Button
                                        onClick={handleSendTestEmail}
                                        disabled={!testEmail || isTesting}
                                        className="gap-2"
                                    >
                                        <TestTube2 className="w-4 h-4" />
                                        {isTesting ? "Sending..." : "Send Test"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Button
                            onClick={handleSendEmails}
                            disabled={!csvFile || !subject || !emailBody || sending}
                            className="min-w-[140px] gap-2"
                        >
                            <Send className="w-4 h-4" />
                            {sending ? "Sending..." : "Send Emails"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
