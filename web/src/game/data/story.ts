import type { StoryScript } from '../types'

export const storyScript: StoryScript = {
  startId: 'intro',
  nodes: {
    intro: {
      id: 'intro',
      lines: [
        'A signal flickers across the virtual skyline: REPLY.',
        'You wrote a melody you cannot remember composing.',
        'Two choices. The same echo.',
      ],
      choices: [
        { id: 'reply', label: 'Send the reply', next: 'prelude' },
        { id: 'remember', label: 'Keep the memory', next: 'prelude' },
      ],
    },
    prelude: {
      id: 'prelude',
      lines: [
        'The rehearsal room hums like a distant moon.',
        'Your hands move before your thoughts can follow.',
        'If the song lands, the loop will close.',
      ],
      next: 'rhythm',
    },
  },
}
