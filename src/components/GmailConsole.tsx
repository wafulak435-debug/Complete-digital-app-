import React from "react";
import GoogleWorkspaceSchoolHub from "./GoogleWorkspaceSchoolHub";

export default function GmailConsole() {
  return (
    <div id="workspace_console" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <GoogleWorkspaceSchoolHub
        mode="full"
        schoolName="Zion Digital Workspace Hub"
      />
    </div>
  );
}
