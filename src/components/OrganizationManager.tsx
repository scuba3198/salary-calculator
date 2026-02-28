import { Briefcase, Check, Plus, Settings, Trash2, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useAppStore } from "../store";

import type { Organization } from "../types/app.types";

interface OrganizationManagerProps {
	onClose: () => void;
}

const OrganizationManager = ({ onClose }: OrganizationManagerProps) => {
	const {
		organizations,
		currentOrg,
		switchOrganization,
		addOrganization,
		updateOrganization,
		deleteOrganization,
	} = useAppStore();

	const [isAdding, setIsAdding] = useState<boolean>(false);
	const [newOrgName, setNewOrgName] = useState<string>("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState<string>("");

	const handleAdd = async () => {
		if (!newOrgName.trim()) return;
		await addOrganization(newOrgName);
		setNewOrgName("");
		setIsAdding(false);
	};

	const startEdit = (org: Organization) => {
		setEditingId(org.id);
		setEditName(org.name);
	};

	const saveEdit = async () => {
		if (!editName.trim() || !editingId) return;
		await updateOrganization(editingId, { name: editName });
		setEditingId(null);
	};

	const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

	const confirmDelete = async (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		await deleteOrganization(id);
		setDeleteConfirmationId(null);
	};

	return (
		<div style={{ padding: "1.5rem" }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "1.5rem",
				}}
			>
				<h2>My Workspaces</h2>
				<button type="button" onClick={onClose} className="icon-btn">
					<X size={20} />
				</button>
			</div>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "0.75rem",
					maxHeight: "300px",
					overflowY: "auto",
				}}
			>
				{organizations.map((org) => (
					<div
						key={org.id}
						className={`glass-card ${currentOrg?.id === org.id ? "active-org" : ""}`}
						style={{
							padding: "0.75rem 1rem",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							border:
								currentOrg?.id === org.id ? "2px solid var(--primary)" : "1px solid var(--border)",
							background:
								currentOrg?.id === org.id ? "rgba(var(--primary-rgb), 0.1)" : "var(--surface)",
						}}
					>
						{editingId === org.id ? (
							<div style={{ display: "flex", gap: "0.5rem", flex: 1 }}>
								<input
									value={editName}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
									style={{ flex: 1, padding: "0.25rem", borderRadius: "4px" }}
								/>
								<button
									type="button"
									onClick={saveEdit}
									className="icon-btn"
									style={{ color: "var(--success)" }}
								>
									<Check size={16} />
								</button>
								<button type="button" onClick={() => setEditingId(null)} className="icon-btn">
									<X size={16} />
								</button>
							</div>
						) : (
							<>
								<button
									type="button"
									onClick={() => switchOrganization(org.id)}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.75rem",
										flex: 1,
										background: "transparent",
										border: "none",
										padding: 0,
										cursor: "pointer",
										textAlign: "left",
										fontFamily: "inherit",
										color: "inherit",
									}}
								>
									<Briefcase size={20} color={org.color || undefined} />
									<span style={{ fontWeight: "500", flex: 1 }}>{org.name}</span>
									{currentOrg?.id === org.id && (
										<span
											style={{
												fontSize: "0.75rem",
												background: "var(--primary)",
												color: "white",
												padding: "0.1rem 0.5rem",
												borderRadius: "1rem",
											}}
										>
											Active
										</span>
									)}
								</button>
								<div style={{ display: "flex", gap: "0.5rem", marginLeft: "1rem" }}>
									<button
										type="button"
										onClick={() => startEdit(org)}
										className="icon-btn"
										title="Rename"
									>
										<Settings size={16} />
									</button>
									{deleteConfirmationId === org.id ? (
										<div
											style={{
												display: "flex",
												gap: "0.5rem",
												alignItems: "center",
											}}
										>
											<span style={{ fontSize: "0.75rem", color: "var(--danger)" }}>Confirm?</span>
											<button
												type="button"
												onClick={(e: React.MouseEvent) => confirmDelete(org.id, e)}
												className="icon-btn"
												title="Confirm Delete"
												style={{ color: "var(--danger)" }}
											>
												<Check size={16} />
											</button>
											<button
												type="button"
												onClick={() => setDeleteConfirmationId(null)}
												className="icon-btn"
												title="Cancel"
											>
												<X size={16} />
											</button>
										</div>
									) : (
										organizations.length > 1 && (
											<button
												type="button"
												onClick={() => setDeleteConfirmationId(org.id)}
												className="icon-btn"
												title="Delete"
												style={{ color: "var(--danger)" }}
											>
												<Trash2 size={16} />
											</button>
										)
									)}
								</div>
							</>
						)}
					</div>
				))}
			</div>

			{isAdding ? (
				<div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
					<input
						id="newOrgName"
						value={newOrgName}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewOrgName(e.target.value)}
						placeholder="New Workspace Name (e.g. Freelance)"
						style={{
							flex: 1,
							padding: "0.5rem",
							borderRadius: "0.5rem",
							border: "1px solid var(--border)",
						}}
					/>
					<button
						type="button"
						onClick={handleAdd}
						style={{
							padding: "0.5rem 1rem",
							background: "var(--success)",
							color: "white",
							border: "none",
							borderRadius: "0.5rem",
							cursor: "pointer",
						}}
					>
						Add
					</button>
					<button
						type="button"
						onClick={() => setIsAdding(false)}
						className="icon-btn"
						style={{
							border: "1px solid var(--border)",
							borderRadius: "0.5rem",
						}}
					>
						<X size={20} />
					</button>
				</div>
			) : (
				<button
					type="button"
					onClick={() => setIsAdding(true)}
					style={{
						marginTop: "1rem",
						width: "100%",
						padding: "0.75rem",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "0.5rem",
						background: "transparent",
						border: "2px dashed var(--border)",
						color: "var(--text-secondary)",
						borderRadius: "0.5rem",
						cursor: "pointer",
					}}
				>
					<Plus size={20} /> Add New Workspace
				</button>
			)}
		</div>
	);
};

export default OrganizationManager;
