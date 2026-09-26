# Integração da UFLA Sede

As páginas `sede.html` e `ranking_sede.html` usam coleções separadas das páginas `paraiso.html` e `ranking_paraiso.html`:

- `startups_sede`: equipes importadas das respostas do Google Forms.
- `evaluations_sede`: avaliações enviadas pela página da Sede.

Cada documento em `startups_sede` deve conter o nome da startup e a URL de download do PDF no Firebase Storage. Campos aceitos incluem `nome` ou `name`, e `pdfUrl`, `Link do PDF`, `Link do PDF do pitch` ou `URL do PDF`.

Exemplo de documento em `startups_sede`:

```json
{
  "nome": "BioGrao Analytics",
  "pdfUrl": "https://firebasestorage.googleapis.com/v0/b/SEU_BUCKET/o/BioGrao_Pitch.pdf?alt=media&token=SEU_TOKEN"
}
```

A lista de startups é atualizada em tempo real. Ao selecionar uma equipe com `pdfUrl` válido, a página mostra o link para abrir o PDF. O ranking da Sede usa as avaliações em `evaluations_sede` e apresenta o link do PDF ao lado da startup.

O projeto não automatiza a exportação do Google Forms para o Firestore: o processo de integração/importação deve gravar os documentos em `startups_sede`. As regras do Firestore precisam permitir a leitura dessa coleção e o envio de documentos para `evaluations_sede` conforme a política de acesso do projeto.
