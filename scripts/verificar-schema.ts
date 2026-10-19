import pg from 'pg'
const { Client } = pg

const url = process.env.DATABASE_URL!
const client = new Client({ connectionString: url })
await client.connect()

const { rows: tabelas } = await client.query<{ tablename: string }>(
  `select tablename from pg_tables where schemaname = 'public' order by tablename`
)

const { rows: funcoes } = await client.query<{ routine_name: string }>(
  `select routine_name from information_schema.routines
   where routine_schema = 'public' and routine_type = 'FUNCTION'
   order by routine_name`
)

const { rows: policies } = await client.query<{ n: string }>(
  `select count(*) as n from pg_policies`
)

const { rows: triggers } = await client.query<{ trigger_name: string; event_object_table: string }>(
  `select trigger_name, event_object_table from information_schema.triggers
   where trigger_schema = 'public' order by trigger_name`
)

await client.end()

console.log('Tabelas:', tabelas.map(r => r.tablename).join(', '))
console.log('Funções:', funcoes.map(r => r.routine_name).join(', '))
console.log('Políticas RLS:', policies[0].n)
console.log('Triggers:', triggers.map(r => `${r.trigger_name}(${r.event_object_table})`).join(', '))
