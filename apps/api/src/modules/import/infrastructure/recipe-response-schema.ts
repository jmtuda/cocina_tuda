const nullableString = { type: ['string', 'null'] } as const;
const nullableMamboInteger = {
  type: ['integer', 'null'],
  minimum: 0,
  maximum: 2147483647,
} as const;

export const recipeResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'name',
    'description',
    'author',
    'servings',
    'difficulty',
    'notes',
    'steps',
    'ingredients',
    'categories',
    'tags',
    'issues',
  ],
  properties: {
    name: nullableString,
    description: nullableString,
    author: nullableString,
    servings: { type: ['integer', 'null'], minimum: 1 },
    difficulty: nullableString,
    notes: nullableString,
    steps: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'mambo'],
        properties: {
          text: { type: 'string' },
          mambo: {
            type: ['object', 'null'],
            additionalProperties: false,
            required: [
              'speed',
              'temperature',
              'ct',
              'durationSeconds',
              'observations',
            ],
            properties: {
              speed: nullableMamboInteger,
              temperature: nullableMamboInteger,
              ct: nullableMamboInteger,
              durationSeconds: nullableMamboInteger,
              observations: nullableString,
            },
          },
        },
      },
    },
    issues: { type: 'array', items: { type: 'string' } },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'ingredient',
          'variant',
          'quantity',
          'unit',
          'optional',
          'observations',
        ],
        properties: {
          ingredient: nullableString,
          variant: nullableString,
          quantity: nullableString,
          unit: nullableString,
          optional: { type: 'boolean' },
          observations: nullableString,
        },
      },
    },
    categories: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
  },
} as const;

export const recipeInterpretationInstruction =
  'Interpreta exclusivamente una receta culinaria. No inventes datos ausentes. Devuelve cantidades decimales con punto cuando sean inequívocas y conserva en observaciones cualquier texto que no puedas estructurar. ' +
  'Devuelve pasos como objetos text y mambo. Asocia líneas de configuración Mambo como «Vel.:1/// Temp.:100/// CT:6/// Tiempo:4m» al paso de cocina inmediatamente anterior; no las numeres como un paso separado. En ese ejemplo speed=1, temperature=100, ct=6 y durationSeconds=240. ' +
  'Los valores numéricos Mambo deben ser enteros entre 0 y 2147483647; convierte tiempos inequívocos a segundos. Conserva ceros explícitos: cero no significa ausente. Usa null para campos ausentes y mambo=null si no hay configuración. ' +
  'No inventes configuraciones ni dupliques una configuración entre pasos. Si la asociación, unidad o valor es ambiguo, conserva el texto original sin perder contenido y añade la duda a issues para revisión humana; no lo asocies por conjetura. Devuelve issues=[] cuando no haya dudas.';
