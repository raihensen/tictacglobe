
import { Category, Language } from '@/src/game.types';
import { IncomingMessage, ServerResponse } from 'http';
var fs = require('fs').promises;
import path from 'path';
import _ from "lodash";

var categoryData: Record<string, Category[]> = {}  // key: language

type Request = IncomingMessage & {
  query: {
    language: Language;
  }
}

const handler = async (req: Request, res: ServerResponse<Request>) => {

  const language = req.query.language
  // countries = await getCountryData(language)

  const categories = await getCategories(language)
  if (!categories) {
    return respondWithError(res)
  }

  res.end(JSON.stringify({
    data: categories
  }))

}

async function getCategories(language: Language): Promise<Category[] | null> {
  if (language.toString() in categoryData) {
    return categoryData[language.toString()]
  }

  const dir = path.join(process.cwd(), 'public', 'data', 'categories', language)
  try {
    const files = await fs.readdir(dir)
    if (!files.length) {
      return null
    }
    const file = path.join(dir, _.max(files) ?? "")
    console.log(`Read categories from file ${file}`);
    const data = await fs.readFile(file)
    const categories = Object.entries(JSON.parse(data)).map(([k, cat]) => {
      const cat1 = cat as Category
      return {
        ...cat1,
        columnDependencies: cat1.columnDependencies.map(col => _.camelCase(col))
      }
    }) as Category[]
    categoryData[language.toString()] = categories
    return categories

  } catch (err) {
    return null
  }
}

function respondWithError(res: ServerResponse<Request>, err: string = "API Error") {
  console.log(`Error: ${err}`)
  res.end(JSON.stringify({ error: err }))
}

export default handler
