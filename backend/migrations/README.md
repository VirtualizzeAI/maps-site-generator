# Migrações

No MVP local, o SQLAlchemy cria as tabelas automaticamente no SQLite. Antes da conexão ao Supabase, será criada uma migration PostgreSQL a partir dos modelos validados nesta fase, evitando manter dois esquemas divergentes.
