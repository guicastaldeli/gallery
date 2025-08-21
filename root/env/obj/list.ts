import { ListType } from './list-type';
export let ListData: ListType[] = [];

export async function loadListData(): Promise<void> {
    const res = await fetch('./.data/obj-list.json');
    ListData = await res.json();
}