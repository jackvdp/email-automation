import React from 'react';
import { Loader2 } from "lucide-react";

const LoadingSpinner = () => {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <span className="ml-2 text-lg text-primary">Checking login status...</span>
            </div>
        </div>
    );
};

export default LoadingSpinner;