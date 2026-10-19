// Conversão da foto do currículo para um data URL embutível.
//
// O formulário guardava a foto com `URL.createObjectURL(file)`, que devolve
// um endereço `blob:` — um ponteiro para a memória DA ABA que fez o upload.
// Ele não é o arquivo: não sobrevive a um F5, não existe em outro
// navegador e, principalmente, não existe para o servidor. Na prática a
// foto nunca chegou a ser salva, e o PDF gerado pelo WeasyPrint nunca teve
// como desenhá-la (caía no selo com a inicial do nome).
//
// A saída aqui é um `data:image/jpeg;base64,...`: o conteúdo da imagem em
// si, que vai junto no JSON de `Resume.content` e é renderizado tanto pelo
// navegador quanto pelo gerador de PDF.
//
// Como isso ocupa espaço no banco (base64 cresce ~33% sobre o binário), a
// imagem é reduzida antes: 400px no maior lado — o suficiente para os 88px
// impressos no PDF, mesmo em 300dpi — e JPEG de qualidade 0.82. Uma foto de
// celular de 4MB termina em torno de 40KB.

/** Maior lado da imagem gravada, em pixels. */
export const LADO_MAXIMO = 400;

/** Qualidade do JPEG de saída (0–1). */
const QUALIDADE = 0.82;

/** Limite do arquivo ORIGINAL aceito, antes da redução. */
export const TAMANHO_MAXIMO_MB = 8;

export class ErroDeImagem extends Error {}

/**
 * Lê um arquivo de imagem e devolve um data URL JPEG reduzido.
 *
 * Lança `ErroDeImagem` com mensagem pronta para exibir quando o arquivo não
 * é uma imagem, é grande demais ou não pôde ser decodificado.
 */
export function arquivoParaDataUrl(arquivo: File): Promise<string> {
  if (!arquivo.type.startsWith("image/")) {
    return Promise.reject(
      new ErroDeImagem("Selecione um arquivo de imagem (JPG, PNG ou WEBP)."),
    );
  }

  if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
    return Promise.reject(
      new ErroDeImagem(
        `A imagem precisa ter no máximo ${TAMANHO_MAXIMO_MB}MB.`,
      ),
    );
  }

  return new Promise((resolve, reject) => {
    // O objectURL aqui é temporário e serve só para decodificar o arquivo;
    // é revogado assim que a imagem carrega, e o que sai da função é o
    // data URL — nunca este endereço.
    const enderecoTemporario = URL.createObjectURL(arquivo);
    const imagem = new Image();

    imagem.onload = () => {
      URL.revokeObjectURL(enderecoTemporario);

      try {
        const escala = Math.min(
          1,
          LADO_MAXIMO / Math.max(imagem.width, imagem.height),
        );
        const largura = Math.max(1, Math.round(imagem.width * escala));
        const altura = Math.max(1, Math.round(imagem.height * escala));

        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;

        const contexto = canvas.getContext("2d");
        if (!contexto) {
          reject(new ErroDeImagem("Não foi possível processar a imagem."));
          return;
        }

        // Fundo branco: PNG com transparência vira preto ao virar JPEG.
        contexto.fillStyle = "#ffffff";
        contexto.fillRect(0, 0, largura, altura);
        contexto.drawImage(imagem, 0, 0, largura, altura);

        resolve(canvas.toDataURL("image/jpeg", QUALIDADE));
      } catch {
        reject(new ErroDeImagem("Não foi possível processar a imagem."));
      }
    };

    imagem.onerror = () => {
      URL.revokeObjectURL(enderecoTemporario);
      reject(new ErroDeImagem("Não foi possível ler a imagem escolhida."));
    };

    imagem.src = enderecoTemporario;
  });
}
