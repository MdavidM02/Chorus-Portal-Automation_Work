@echo off
setlocal EnableDelayedExpansion

echo =========================================
echo JIRA AUTOMATION SCRIPT STARTED
echo =========================================

REM ==================================================
REM Jenkins Result
REM ==================================================
set "STATUS=%BUILD_RESULT%"
if "%STATUS%"=="" set "STATUS=FAILURE"

echo Build Result : %STATUS%

REM ==================================================
REM Jira Config
REM ==================================================
set "JIRA_URL=https://ai4process-team.atlassian.net"
set "PROJECT=SCRUM"

REM Credentials from Jenkins Binding
set "USER=%JIRA_USER%"
set "TOKEN=%JIRA_TOKEN%"

REM ==================================================
REM Validate Credentials
REM ==================================================
if "%USER%"=="" (
  echo ERROR: JIRA_USER is empty.
  echo Check Jenkins credential binding.
  goto :Cleanup
)

if "%TOKEN%"=="" (
  echo ERROR: JIRA_TOKEN is empty.
  echo Check Jenkins credential binding.
  goto :Cleanup
)

echo Jira credentials loaded
echo =========================================

REM ==================================================
REM Build Info
REM ==================================================
set "SUMMARY=Build: %JOB_NAME% #%BUILD_NUMBER%"
set "DESC=Build URL: %BUILD_URL%"

echo Job Name     : %JOB_NAME%
echo Build Number : %BUILD_NUMBER%
echo Summary      : %SUMMARY%
echo =========================================

REM ==================================================
REM Temp Workspace
REM ==================================================
set "TMP=%TEMP%\jira_%RANDOM%"
mkdir "%TMP%" >nul 2>&1

set "SEARCH_JSON=%TMP%\search.json"
set "RESP_JSON=%TMP%\resp.json"
set "DATA_JSON=%TMP%\data.json"

set "SEARCH_PS=%TMP%\search.ps1"
set "PARSE_PS=%TMP%\parse.ps1"
set "CREATE_PS=%TMP%\create.ps1"
set "COMMENT_PS=%TMP%\comment.ps1"

set "PARSE_OUT=%TMP%\parse.txt"

REM ==================================================
REM Auth (Base64)
REM ==================================================
for /f %%i in ('
 powershell -NoProfile -Command ^
 "[Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes('%USER%:%TOKEN%'))"
') do set "AUTH=%%i"

if "%AUTH%"=="" (
  echo ERROR: Failed to generate auth token
  goto :Cleanup
)

echo Auth token generated
echo =========================================

REM ==================================================
REM Build Base Summary (remove build number)
REM ==================================================
for /f "tokens=1 delims=#" %%a in ("%SUMMARY%") do set "BASE_SUMMARY=%%a"

for /f "tokens=* delims= " %%a in ("%BASE_SUMMARY%") do set "BASE_SUMMARY=%%a"

echo Full Summary : %SUMMARY%
echo Base Summary : %BASE_SUMMARY%
echo =========================================

REM ==================================================
REM Build Search JSON (Safe JQL)
REM ==================================================
> "%SEARCH_PS%" echo $base = "%BASE_SUMMARY%"
>>"%SEARCH_PS%" echo $proj = "%PROJECT%"
>>"%SEARCH_PS%" echo $jql = "project=$proj AND summary~`"$base`""
>>"%SEARCH_PS%" echo
>>"%SEARCH_PS%" echo $body = @{
>>"%SEARCH_PS%" echo   jql = $jql
>>"%SEARCH_PS%" echo   maxResults = 1
>>"%SEARCH_PS%" echo   fields = @("key","status")
>>"%SEARCH_PS%" echo }
>>"%SEARCH_PS%" echo
>>"%SEARCH_PS%" echo $body ^| ConvertTo-Json -Depth 5 ^| Out-File "%SEARCH_JSON%" -Encoding UTF8

powershell -NoProfile -ExecutionPolicy Bypass -File "%SEARCH_PS%"
if errorlevel 1 goto :Cleanup

type "%SEARCH_JSON%"
echo =========================================

REM ==================================================
REM Call Jira Search
REM ==================================================
echo Searching Jira...

curl -s -X POST "%JIRA_URL%/rest/api/3/search/jql" ^
 -H "Authorization: Basic %AUTH%" ^
 -H "Content-Type: application/json" ^
 --data @"%SEARCH_JSON%" > "%RESP_JSON%"

type "%RESP_JSON%"
echo =========================================

REM ==================================================
REM Parse Result
REM ==================================================
> "%PARSE_PS%" echo $r = Get-Content "%RESP_JSON%" ^| ConvertFrom-Json
>>"%PARSE_PS%" echo if($r.issues.Count -gt 0){
>>"%PARSE_PS%" echo   $r.issues[0].key
>>"%PARSE_PS%" echo   $r.issues[0].fields.status.name
>>"%PARSE_PS%" echo }

powershell -NoProfile -ExecutionPolicy Bypass -File "%PARSE_PS%" > "%PARSE_OUT%"

set "ISSUE_KEY="
set "ISSUE_STATUS="

set /p ISSUE_KEY=<"%PARSE_OUT%"

for /f "skip=1 delims=" %%a in (%PARSE_OUT%) do (
  if not defined ISSUE_STATUS set "ISSUE_STATUS=%%a"
)

if defined ISSUE_KEY (
  echo Found Issue  : %ISSUE_KEY%
  echo Issue State : %ISSUE_STATUS%
) else (
  echo No issue found
)

echo =========================================

REM ==================================================
REM Decision Logic
REM ==================================================
if /I "%STATUS%"=="FAILURE" (

  echo Build FAILED

  if defined ISSUE_KEY (
    goto :AddComment
  ) else (
    goto :CreateIssue
  )
)

if /I "%STATUS%"=="SUCCESS" (

  echo Build SUCCESS

  if defined ISSUE_KEY (

    if /I "%ISSUE_STATUS%"=="Done" goto :Cleanup
    if /I "%ISSUE_STATUS%"=="Closed" goto :Cleanup

    goto :AddComment
  )

  goto :Cleanup
)

goto :Cleanup


REM ==================================================
REM Create Issue
REM ==================================================
:CreateIssue

echo Creating Jira issue...

set "ISSUE_TITLE=%BASE_SUMMARY%"
set "ISSUE_DESC=Build failed. %DESC% (Build: %SUMMARY%)"

> "%CREATE_PS%" echo $b = @{
>>"%CREATE_PS%" echo fields = @{
>>"%CREATE_PS%" echo   project = @{ key = "%PROJECT%" }
>>"%CREATE_PS%" echo   summary = "%ISSUE_TITLE%"
>>"%CREATE_PS%" echo   issuetype = @{ name = "Bug" }
>>"%CREATE_PS%" echo   description = @{
>>"%CREATE_PS%" echo     type="doc"
>>"%CREATE_PS%" echo     version=1
>>"%CREATE_PS%" echo     content=@(@{
>>"%CREATE_PS%" echo       type="paragraph"
>>"%CREATE_PS%" echo       content=@(@{
>>"%CREATE_PS%" echo         type="text"
>>"%CREATE_PS%" echo         text="%ISSUE_DESC%"
>>"%CREATE_PS%" echo       })
>>"%CREATE_PS%" echo     })
>>"%CREATE_PS%" echo   }
>>"%CREATE_PS%" echo }
>>"%CREATE_PS%" echo }
>>"%CREATE_PS%" echo $b ^| ConvertTo-Json -Depth 10 ^| Out-File "%DATA_JSON%" -Encoding UTF8

powershell -NoProfile -ExecutionPolicy Bypass -File "%CREATE_PS%"

curl -s -X POST "%JIRA_URL%/rest/api/3/issue" ^
 -H "Authorization: Basic %AUTH%" ^
 -H "Content-Type: application/json" ^
 --data @"%DATA_JSON%"

goto :Cleanup


REM ==================================================
REM Add Comment
REM ==================================================
:AddComment

echo Adding comment to %ISSUE_KEY%...

set "COMMENT=Build %STATUS%. %DESC%"

> "%COMMENT_PS%" echo $c = @{
>>"%COMMENT_PS%" echo body = @{
>>"%COMMENT_PS%" echo   type="doc"
>>"%COMMENT_PS%" echo   version=1
>>"%COMMENT_PS%" echo   content=@(@{
>>"%COMMENT_PS%" echo     type="paragraph"
>>"%COMMENT_PS%" echo     content=@(@{
>>"%COMMENT_PS%" echo       type="text"
>>"%COMMENT_PS%" echo       text="%COMMENT%"
>>"%COMMENT_PS%" echo     })
>>"%COMMENT_PS%" echo   })
>>"%COMMENT_PS%" echo }
>>"%COMMENT_PS%" echo }
>>"%COMMENT_PS%" echo $c ^| ConvertTo-Json -Depth 10 ^| Out-File "%DATA_JSON%" -Encoding UTF8

powershell -NoProfile -ExecutionPolicy Bypass -File "%COMMENT_PS%"

curl -s -X POST "%JIRA_URL%/rest/api/3/issue/%ISSUE_KEY%/comment" ^
 -H "Authorization: Basic %AUTH%" ^
 -H "Content-Type: application/json" ^
 --data @"%DATA_JSON%"

goto :Cleanup


REM ==================================================
REM Cleanup
REM ==================================================
:Cleanup

echo Cleaning up...

rmdir /s /q "%TMP%" 2>nul

echo =========================================
echo JIRA AUTOMATION FINISHED
echo =========================================

endlocal
