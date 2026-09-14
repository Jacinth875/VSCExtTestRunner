// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

class TestRunnerViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'testRunner.runView';

	constructor(private readonly extensionUri: vscode.Uri) {}

	public resolveWebviewView(webviewView: vscode.WebviewView) {
		webviewView.webview.options = {
			enableScripts: true
		};

		webviewView.webview.html = this.getHtml(webviewView.webview);

		webviewView.webview.onDidReceiveMessage((message) => {
			if (message.command === 'run') {
				const text: string = message.text ?? '';
				if (!text.trim()) {
					return;
				}
				const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal('Test Runner');
				terminal.show();
				terminal.sendText(text, true);
			}
		});
	}

	private getHtml(webview: vscode.Webview): string {
		const nonce = getNonce();
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
	<style>
		body {
			font-family: var(--vscode-font-family);
			padding: 8px;
		}
		#input {
			width: 100%;
			box-sizing: border-box;
			padding: 4px;
			margin-bottom: 8px;
			background: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border, transparent);
		}
		#run {
			width: 100%;
			padding: 6px;
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			cursor: pointer;
		}
		#run:hover {
			background: var(--vscode-button-hoverBackground);
		}
	</style>
</head>
<body>
	<input id="input" type="text" placeholder="Enter command..." />
	<button id="run">Run</button>
	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();
		const input = document.getElementById('input');
		const button = document.getElementById('run');

		function runCommand() {
			vscode.postMessage({ command: 'run', text: input.value });
		}

		button.addEventListener('click', runCommand);
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				runCommand();
			}
		});
	</script>
</body>
</html>`;
	}
}

function getNonce(): string {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "runTest" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('runTest.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Identity-WDM-TestRunner!');
	});

	context.subscriptions.push(disposable);

	const provider = new TestRunnerViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(TestRunnerViewProvider.viewType, provider)
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
