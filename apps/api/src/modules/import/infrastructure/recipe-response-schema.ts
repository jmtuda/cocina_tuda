const nullableString = { type: ['string', 'null'] } as const;

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
  ],
  properties: {
    name: nullableString,
    description: nullableString,
    author: nullableString,
    servings: { type: ['integer', 'null'], minimum: 1 },
    difficulty: nullableString,
    notes: nullableString,
    steps: { type: 'array', items: { type: 'string' } },
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
  'Interpreta exclusivamente una receta culinaria. No inventes datos ausentes. Devuelve cantidades decimales con punto cuando sean inequívocas y conserva en observaciones cualquier texto que no puedas estructurar.';
