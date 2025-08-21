export let ListData = [];
export async function loadListData() {
    const res = await fetch('./.data/obj-list.json');
    ListData = await res.json();
}
