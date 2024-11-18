import React from "react";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css"
const ReactQuill = dynamic(() => import("react-quill"), {
    ssr: false,
    loading: () => <p>Loading editor...</p>,
});

const QuillWrapper = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
    return (
        <ReactQuill
            theme="snow"
            value={value}
            onChange={onChange}
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
    );
};

export default QuillWrapper;