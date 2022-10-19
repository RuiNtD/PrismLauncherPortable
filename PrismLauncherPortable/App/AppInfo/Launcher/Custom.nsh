${SegmentFile}

${SegmentPre}
	ReadRegStr $0 HKLM "Software\Microsoft\Windows NT\CurrentVersion" "CurrentBuild"

    ${If} $0 < 10000
	    StrCpy $ProgramExecutable "PrismLauncherLegacy\PrismLauncher.exe"
    ${EndIf}
!macroend
