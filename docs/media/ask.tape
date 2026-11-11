# Records docs/media/ask.gif: one question through `npm run ask`, answer with verified citations.
# Run from the repo root with the inference box reachable and .env set: vhs docs/media/ask.tape
# (VHS 0.12.1 from Homebrew; it needs ttyd and ffmpeg on the PATH). One run costs about $0.03 of API calls.
Output docs/media/ask.gif

Set Shell "bash"
Set FontSize 18
Set Width 1400
Set Height 600
Set Padding 24
Set TypingSpeed 45ms
Set Theme "Builtin Dark"

Hide
Type "export PS1='$ ' && clear"
Enter
Show

Sleep 500ms
Type 'npm run -s ask -- "Why did the live product stay wide?"'
Sleep 600ms
Enter
# About 1 s of the real wait stays visible; the rest is cut (Hide) and the final screen holds about 14 s.
# The real time of the call is in the last output line.
Sleep 1s
Hide
Wait+Screen@90s /chunks given/
Show
Sleep 14s
