# Instalação das dependências
yarn`

# Criar o container do banco de dados
`docker-compose up -d` para criar o container com o banco de dados

# Configurar variaveis de ambiente
dentro da pasta env, criar um arquivo .env.dev e copiar o conteúdo de .env.example para ela.

# Rodar a migration para criar as tabelas
`yarn migration:run:dev` para rodar as migrations

# Executar a aplicação
`yarn dev` para rodar a aplicação

# Executar os teste
`yarn test`para rodar os testes da aplicação
