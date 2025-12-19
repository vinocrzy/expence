
// Simple event bus for data changes
export const dataEvents = new EventTarget();

export const notifyDataChange = (table: string) => {
    dataEvents.dispatchEvent(new CustomEvent('update', { detail: { table } }));
};
