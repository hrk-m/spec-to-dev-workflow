export async function deleteGroup(id: number): Promise<void> {
  const res = await fetch(`/api/v1/groups/${String(id)}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const body = await res.json();
    throw new Error((body as { message: string }).message);
  }
}
