// lib/demo-mode.ts

// Принудительно отключаем демо-режим для всех (и для админа, и для юзеров).
// Возвращаем false, чтобы ни один компонент не отрендерил "демо" интерфейс.
export async function isDemoMode() {
  return false;
}

export async function getDemoUserId() {
  return null;
}