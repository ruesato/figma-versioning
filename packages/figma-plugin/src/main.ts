import { once, showUI } from '@create-figma-plugin/utilities';

export default function () {
  once('CREATE_VERSION', function (data: { description: string }) {
    const { description } = data;
    // TODO: Implement version creation logic
    console.warn('Creating version:', description);
    figma.closePlugin();
  });

  showUI({
    width: 400,
    height: 600
  });
}
