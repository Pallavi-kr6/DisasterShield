import fs from 'node:fs';
import path from 'node:path';

const STORE_PATH = path.join(process.cwd(), 'local_store.json');

function readStore() {
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { users: [], claims: [], transactions: [], risk_logs: [] };
  }
}

function writeStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

export function localInsert(table, row) {
  const store = readStore();
  if (!store[table]) store[table] = [];
  store[table].push(row);
  writeStore(store);
  return row;
}

export function localUpsertById(table, idField, row) {
  const store = readStore();
  if (!store[table]) store[table] = [];
  const id = row?.[idField];
  if (!id) {
    store[table].push(row);
    writeStore(store);
    return row;
  }
  const idx = store[table].findIndex((r) => r?.[idField] === id);
  if (idx >= 0) store[table][idx] = { ...store[table][idx], ...row };
  else store[table].push(row);
  writeStore(store);
  return row;
}

export function localSelect(table, predicate, { limit = 200 } = {}) {
  const store = readStore();
  const rows = (store[table] || []).filter(predicate);
  return rows.slice(-limit).reverse();
}

export function localFindOne(table, predicate) {
  const store = readStore();
  return (store[table] || []).find(predicate) || null;
}

