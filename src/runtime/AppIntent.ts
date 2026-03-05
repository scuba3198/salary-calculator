import type { User } from "@supabase/supabase-js";
import type { Organization } from "../types/app.types";

export type AppIntent =
	// Calendar
	| { readonly _tag: "SetViewYear"; readonly year: number }
	| { readonly _tag: "SetViewMonth"; readonly month: number }
	| {
		readonly _tag: "ToggleDate";
		readonly year: number;
		readonly month: number;
		readonly day: number;
	}

	// Settings
	| { readonly _tag: "SetHourlyRate"; readonly value: number | "" }
	| { readonly _tag: "SetDailyHours"; readonly value: number | "" }
	| { readonly _tag: "SetTdsPercentage"; readonly value: number | "" }
	| { readonly _tag: "ToggleTheme" }

	// Organizations
	| { readonly _tag: "SwitchOrganization"; readonly orgId: string }
	| { readonly _tag: "AddOrganization"; readonly name: string }
	| {
		readonly _tag: "UpdateOrganization";
		readonly id: string;
		readonly updates: Partial<Organization>;
	}
	| { readonly _tag: "DeleteOrganization"; readonly id: string }

	// Data Management
	| { readonly _tag: "RequestReset" }
	| { readonly _tag: "ConfirmAction" }
	| { readonly _tag: "DismissConfirm" }
	| { readonly _tag: "DismissAlert" }
	| { readonly _tag: "ShowAlert"; readonly message: string }

	// Auth (dispatched internally by the auth stream or form)
	| { readonly _tag: "AuthChanged"; readonly user: User | null }
	| { readonly _tag: "ForceLogout" }

	// Auth Form (dispatched by the Auth component)
	| { readonly _tag: "SubmitLogin"; readonly email: string; readonly password: string }
	| {
		readonly _tag: "SubmitSignUp";
		readonly email: string;
		readonly password: string;
		readonly fullName: string;
	}

	// Install
	| { readonly _tag: "PromptInstall" }
	| { readonly _tag: "SetInstallPromptVisible"; readonly visible: boolean }
	| { readonly _tag: "DismissInstallPrompt" };
