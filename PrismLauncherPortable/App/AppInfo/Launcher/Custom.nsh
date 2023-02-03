${SegmentFile}

${SegmentPre}
	; Windows 7 Support

	ReadRegStr $0 HKLM "Software\Microsoft\Windows NT\CurrentVersion" "CurrentBuild"

	${If} $0 < 10000
	  ${ReadLauncherConfig} $ProgramExecutable Launch ProgramExecutable
  ${EndIf}

	; ARM64 Support

  ReadRegStr $0 HKLM "HARDWARE\DESCRIPTION\System" "Identifier"
	StrCpy $1 $0 3 0

	${If} $1 == "ARM"
		${ReadLauncherConfig} $ProgramExecutable Launch ProgramExecutableARM64
	${EndIf}
!macroend
