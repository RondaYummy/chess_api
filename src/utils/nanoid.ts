export async function importNanoid(): Promise<any> {
  const module = await (eval(`import('nanoid')`));
  return module;
}

export async function nanoid() {
  return (await importNanoid()).nanoid();
}
// USE:
// 
