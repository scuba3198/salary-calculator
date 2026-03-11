import { Option } from "effect";
import { Plus, Settings2, Trash2, X } from "lucide-react";
import { useState } from "react";
import { dispatch, useAppState } from "../hooks/useAppRuntime";
import type { OrganizationId } from "../types/app.types";

interface Props {
	onClose: () => void;
}

export default function OrganizationManager({ onClose }: Props) {
	const state = useAppState();
	const { organizations, currentOrgId, user, isSyncing } = state;
	const currentOrgIdValue = Option.getOrUndefined(currentOrgId);

	const [newOrgName, setNewOrgName] = useState("");
	const [editingId, setEditingId] = useState<OrganizationId | null>(null);
	const [editName, setEditName] = useState("");

	const handleAdd = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newOrgName.trim()) return;
		dispatch({ _tag: "AddOrganization", name: newOrgName.trim() });
		setNewOrgName("");
	};

	const handleUpdate = (id: OrganizationId) => {
		if (!editName.trim()) return;
		dispatch({ _tag: "UpdateOrganization", id, updates: { name: editName.trim() } });
		setEditingId(null);
	};

	return (
		<div className="org-manager">
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "2rem",
				}}
			>
				<h2 style={{ fontSize: "1.5rem", margin: 0 }}>Workspaces</h2>
				<button type="button" onClick={onClose} className="icon-btn">
					<X size={24} />
				</button>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
				{/* Org List */}
				<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
					{organizations.map((org) => (
						<div
							key={org.id}
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								padding: "1rem",
								background:
									org.id === currentOrgIdValue ? "var(--primary-light)" : "var(--surface)",
								border: `1px solid ${
									org.id === currentOrgIdValue ? "var(--primary)" : "var(--border-light)"
								}`,
								transition: "all 0.2s ease",
							}}
						>
							{editingId === org.id ? (
								<div style={{ display: "flex", gap: "0.5rem", flex: 1 }}>
									<input
										type="text"
										value={editName}
										onChange={(e) => setEditName(e.target.value)}
										className="minimal-input"
										style={{ flex: 1, padding: "0.25rem" }}
									/>
									<button
										type="button"
										onClick={() => handleUpdate(org.id)}
										className="primary-btn"
										style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem" }}
									>
										Save
									</button>
									<button
										type="button"
										onClick={() => setEditingId(null)}
										className="icon-btn"
										style={{ padding: "0.25rem" }}
									>
										<X size={16} />
									</button>
								</div>
							) : (
								<>
									<div
										onClick={() => dispatch({ _tag: "SwitchOrganization", orgId: org.id })}
										style={{
											flex: 1,
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											gap: "0.75rem",
										}}
									>
										<span style={{ fontWeight: 500 }}>{org.name}</span>
										{org.id === currentOrgIdValue && (
											<span
												style={{
													fontSize: "0.6rem",
													background: "var(--accent)",
													color: "#ffffff",
													padding: "0.1rem 0.3rem",
													borderRadius: "2px",
												}}
											>
												ACTIVE
											</span>
										)}
									</div>
									<div style={{ display: "flex", gap: "0.5rem" }}>
										<button
											type="button"
											onClick={() => {
												setEditingId(org.id);
												setEditName(org.name);
											}}
											className="icon-btn"
											style={{ padding: "0.25rem" }}
											title="Edit Workspace Name"
										>
											<Settings2 size={16} />
										</button>
										{organizations.length > 1 && org.id !== "guest" && (
											<button
												type="button"
												onClick={() => dispatch({ _tag: "DeleteOrganization", id: org.id })}
												className="icon-btn"
												style={{ padding: "0.25rem", color: "var(--accent)" }}
												title="Delete Workspace"
											>
												<Trash2 size={16} />
											</button>
										)}
									</div>
								</>
							)}
						</div>
					))}
				</div>

				{/* Add New Org */}
				{Option.isSome(user) && (
					<form
						onSubmit={handleAdd}
						style={{
							display: "flex",
							gap: "0.75rem",
							padding: "1rem",
							background: "var(--surface)",
							border: "1px dashed var(--border)",
						}}
					>
						<input
							type="text"
							value={newOrgName}
							onChange={(e) => setNewOrgName(e.target.value)}
							placeholder="New Workspace Name..."
							className="minimal-input"
							style={{ flex: 1 }}
							disabled={isSyncing}
						/>
						<button
							type="submit"
							disabled={isSyncing || !newOrgName.trim()}
							className="primary-btn"
							style={{ padding: "0.5rem 1rem" }}
						>
							<Plus size={18} />
						</button>
					</form>
				)}

				{Option.isNone(user) && (
					<p
						style={{
							fontSize: "0.8rem",
							textAlign: "center",
							opacity: 0.7,
							fontStyle: "italic",
						}}
					>
						Login to create multiple workspaces and sync data.
					</p>
				)}
			</div>
		</div>
	);
}
