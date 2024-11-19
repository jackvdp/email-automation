import { Card, CardHeader, CardDescription, CardContent, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { LogIn } from "lucide-react";

export default function Login({ handleSignIn }: { handleSignIn: () => void }) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="max-w-4xl mx-auto p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Login Required</CardTitle>
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
        </div>
    );
}
