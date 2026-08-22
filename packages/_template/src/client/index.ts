import { defineClientModule } from '@kernalo/kernel/client'
export const templateClient = defineClientModule({
  id: 'template',
  name: 'Template',
  icon: 'puzzle',
  nav: [
    {
      id: 'template',
      label: 'Widgets',
      icon: 'puzzle',
      href: '/template',
      permission: 'template.widget.view',
    },
  ],
  // routes/presenters/slots are added by the app's module loader convention – see repos/app/src/lib/modules
})
export default templateClient
