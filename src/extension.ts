// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { exec } from 'child_process';

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
				const target: string = message.target === 'vscode' ? 'vscode' : 'external';
				if (target === 'vscode') {
					this.runInVsCodeTerminal(text);
				} else {
					this.runInExternalTerminal(text);
				}
			}
		});
	}

	private runInVsCodeTerminal(command: string) {
		const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal('Test Runner');
		terminal.show();
		terminal.sendText(command, true);
	}

	private runInExternalTerminal(command: string) {
		const cwd = this.getCurrentCwd();

		if (process.platform === 'win32') {
			// Opens a new external PowerShell window (command syntax uses $env:), cd's to the same path, then runs the command.
			const escapedCwd = cwd.replace(/'/g, "''");
			const escapedCommand = command.replace(/"/g, '\\"');
			const psCommand = `Set-Location -LiteralPath '${escapedCwd}'; ${escapedCommand}`;
			const encodedPsCommand = psCommand.replace(/"/g, '\\"');
			// The empty "" title argument prevents `start` from swallowing the real command as its window title.
			const fullCommand = `start "" powershell.exe -NoExit -Command "${encodedPsCommand}"`;
			exec(fullCommand, { cwd });
		} else if (process.platform === 'darwin') {
			const escapedCommand = command.replace(/"/g, '\\"');
			const script = `tell application "Terminal" to do script "cd \\"${cwd}\\" && ${escapedCommand}"`;
			exec(`osascript -e '${script}'`, { cwd });
		} else {
			// Linux: try a common terminal emulator.
			const escapedCommand = command.replace(/"/g, '\\"');
			exec(`x-terminal-emulator -e bash -c "cd \\"${cwd}\\" && ${escapedCommand}; exec bash"`, { cwd });
		}
	}

	private getCurrentCwd(): string {
		const activeTerminal = vscode.window.activeTerminal;
		const shellIntegrationCwd = (activeTerminal?.shellIntegration as { cwd?: vscode.Uri })?.cwd;
		if (shellIntegrationCwd?.fsPath) {
			return shellIntegrationCwd.fsPath;
		}

		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (workspaceFolder) {
			return workspaceFolder.uri.fsPath;
		}

		return process.cwd();
	}

	private getHtml(webview: vscode.Webview): string {
		const nonce = getNonce();
		const environments = ['online1', 'online2', 'online3', 'online4', 'online5', 'onlineqa', 'onlinesup'];
		const testRunners = [
			'consumerRegression',
			'partnerRegression',
			'UDARegression',
			'wdmSmoke',
			'wdmSmoke:randomBrand',
			'regression:randomBrand',
			'email-regression-wdm-ui',
			'email-smoke-wdm-ui'
		];
		const envOptions = environments.map(e => `<option value="${e}">${e}</option>`).join('\n\t\t\t');
		const runnerOptions = testRunners.map(r => `<option value="${r}">${r}</option>`).join('\n\t\t\t');

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
		label {
			display: block;
			margin-bottom: 4px;
			font-size: 12px;
			opacity: 0.8;
		}
		select, input {
			width: 100%;
			box-sizing: border-box;
			padding: 4px;
			margin-bottom: 10px;
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
		.checkbox-row {
			display: flex;
			align-items: center;
			gap: 6px;
			margin-bottom: 6px;
		}
		.checkbox-row input[type="checkbox"] {
			width: auto;
			margin: 0;
		}
		.checkbox-row label {
			display: inline;
			margin-bottom: 0;
			font-size: 13px;
			opacity: 1;
			cursor: pointer;
		}
	</style>
</head>
<body>
	<label for="env">Environment</label>
	<select id="env">
			${envOptions}
	</select>

	<label for="consumerBrand">Consumer Brand Name</label>
	<input id="consumerBrand" type="text" placeholder="e.g. aami,apia" />

	<label for="partnerBrand">Partner Brand Name</label>
	<input id="partnerBrand" type="text" placeholder="e.g. extranet,vsl" />

	<label for="runner">Test Runner</label>
	<select id="runner">
			${runnerOptions}
	</select>

	<div class="checkbox-row">
		<input type="checkbox" id="externalTerminal" checked />
		<label for="externalTerminal">External terminal</label>
	</div>
	<div class="checkbox-row">
		<input type="checkbox" id="vscodeTerminal" />
		<label for="vscodeTerminal">VSC terminal</label>
	</div>

	<button id="run">Run</button>
	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();
		const envSelect = document.getElementById('env');
		const runnerSelect = document.getElementById('runner');
		const consumerBrandInput = document.getElementById('consumerBrand');
		const partnerBrandInput = document.getElementById('partnerBrand');
		const externalTerminalCheckbox = document.getElementById('externalTerminal');
		const vscodeTerminalCheckbox = document.getElementById('vscodeTerminal');
		const button = document.getElementById('run');

		externalTerminalCheckbox.addEventListener('change', () => {
			if (externalTerminalCheckbox.checked) {
				vscodeTerminalCheckbox.checked = false;
			} else {
				vscodeTerminalCheckbox.checked = true;
			}
		});

		vscodeTerminalCheckbox.addEventListener('change', () => {
			if (vscodeTerminalCheckbox.checked) {
				externalTerminalCheckbox.checked = false;
			} else {
				externalTerminalCheckbox.checked = true;
			}
		});

		function normalizeBrands(value) {
			return value
				.split(',')
				.map(function (b) { return b.trim(); })
				.filter(function (b) { return b.length > 0; })
				.join(',');
		}

		function runCommand() {
			const env = envSelect.value;
			const runner = runnerSelect.value;
			const consumerBrand = normalizeBrands(consumerBrandInput.value);
			const partnerBrand = normalizeBrands(partnerBrandInput.value);
			const target = vscodeTerminalCheckbox.checked ? 'vscode' : 'external';

			let command = '$env:env="' + env + '";';
			if (consumerBrand) {
				command += ' $env:BRAND_OVERRIDE="' + consumerBrand + '";';
			}
			if (partnerBrand) {
				command += ' $env:PARTNER_OVERRIDE="' + partnerBrand + '";';
			}
			command += ' npm run ' + runner;

			vscode.postMessage({ command: 'run', text: command, target: target });
		}

		button.addEventListener('click', runCommand);
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
	console.log('Extension "runTest" is now active!');

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
