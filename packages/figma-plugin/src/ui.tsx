import { render, Container, VerticalSpace, Text, Textbox, Button } from '@create-figma-plugin/ui';
import { emit } from '@create-figma-plugin/utilities';
import { useState } from 'preact/hooks';

import './output.css';

function Plugin() {
  const [description, setDescription] = useState('');

  function handleCreateVersion() {
    if (description.trim()) {
      emit('CREATE_VERSION', { description });
    }
  }

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <Text>
        <div class="text-2xl font-bold">Figma Versioning</div>
      </Text>
      <VerticalSpace space="large" />
      <Text>Create a new version of your design</Text>
      <VerticalSpace space="small" />
      <Textbox
        value={description}
        onValueInput={setDescription}
        placeholder="Version description"
      />
      <VerticalSpace space="small" />
      <Button onClick={handleCreateVersion} fullWidth>
        Create Version
      </Button>
    </Container>
  );
}

export default render(Plugin);
