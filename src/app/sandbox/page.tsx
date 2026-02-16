"use client";

import { ModeToggle } from "@/components/ui/mode-toggle";
import {
  Accordion,
  Alert,
  AlertDialog,
  Avatar,
  Breadcrumbs,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  CheckboxGroup,
  Chip,
  Color,
  ColorArea,
  ColorField,
  ColorInputGroup,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  ComboBox,
  DateField,
  DateInputGroup,
  Description,
  Disclosure,
  DisclosureGroup,
  Dropdown,
  FieldError,
  Fieldset,
  Form,
  Input,
  InputGroup,
  InputOTP,
  Kbd,
  Label,
  Link,
  ListBox,
  Modal,
  NumberField,
  parseColor,
  Popover,
  Radio,
  RadioGroup,
  ScrollShadow,
  SearchField,
  Select,
  Separator,
  Skeleton,
  Slider,
  Spinner,
  Surface,
  Switch,
  Tabs,
  Tag,
  TagGroup,
  TextArea,
  TextField,
  TimeField,
  Toast,
  ToastQueue,
  Tooltip,
} from "@heroui/react";
import React from "react";

const toastQueue = new ToastQueue({ maxVisibleToasts: 3 });

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="border-b pb-2 font-semibold">{title}</h2>
      <div className="flex flex-wrap items-start gap-8">{children}</div>
    </section>
  );
}

function Demo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export default function Sandbox() {
  const [colorFieldValue, setColorFieldValue] = React.useState<Color | null>(
    parseColor("#0485F7"),
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 p-8">
      <Toast.Provider queue={toastQueue} placement="bottom end" />

      <h1 className="text-3xl font-bold">HeroUI v3 Component Sandbox</h1>
      <ModeToggle />

      {/* ── Buttons & Actions ── */}
      <Section title="Buttons & Actions">
        <Demo label="Button variants">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="outline">Outline</Button>
        </Demo>

        <Demo label="Button sizes">
          <Button size="sm" variant="secondary">
            Small
          </Button>
          <Button size="md" variant="secondary">
            Medium
          </Button>
          <Button size="lg" variant="secondary">
            Large
          </Button>
        </Demo>

        <Demo label="ButtonGroup">
          <ButtonGroup>
            <Button variant="secondary">Cut</Button>
            <Button variant="secondary">Copy</Button>
            <Button variant="secondary">Paste</Button>
          </ButtonGroup>
        </Demo>

        <Demo label="Link">
          <Link href="#">Default link</Link>
          <Link href="#" className="text-brand">
            Secondary
            <Link.Icon />
          </Link>
        </Demo>
      </Section>

      {/* ── Navigation ── */}
      <Section title="Navigation">
        <Demo label="Breadcrumbs">
          <Breadcrumbs>
            <Breadcrumbs.Item href="#">Home</Breadcrumbs.Item>
            <Breadcrumbs.Item href="#">Products</Breadcrumbs.Item>
            <Breadcrumbs.Item>Laptop</Breadcrumbs.Item>
          </Breadcrumbs>
        </Demo>

        <Demo label="Tabs">
          <Tabs>
            <Tabs.ListContainer>
              <Tabs.List aria-label="Views">
                <Tabs.Tab id="day">
                  Day
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="week">
                  Week
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="month">
                  Month
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel id="day">
              <p className="mt-2 text-sm text-muted">Daily view content</p>
            </Tabs.Panel>
            <Tabs.Panel id="week">
              <p className="mt-2 text-sm text-muted">Weekly view content</p>
            </Tabs.Panel>
            <Tabs.Panel id="month">
              <p className="mt-2 text-sm text-muted">Monthly view content</p>
            </Tabs.Panel>
          </Tabs>
        </Demo>

        <Demo label="Accordion">
          <Accordion className="w-72">
            <Accordion.Item>
              <Accordion.Heading>
                <Accordion.Trigger>
                  What is HeroUI?
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>
                  HeroUI is a React UI library built on Tailwind CSS v4 and
                  React Aria.
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item>
              <Accordion.Heading>
                <Accordion.Trigger>
                  Is it accessible?
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>
                  Yes, all components are built on React Aria for full
                  accessibility.
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Demo>

        <Demo label="Disclosure">
          <Disclosure defaultExpanded>
            <Disclosure.Heading>
              <Button slot="trigger" variant="secondary">
                Toggle details
                <Disclosure.Indicator />
              </Button>
            </Disclosure.Heading>
            <Disclosure.Content>
              <Disclosure.Body className="mt-2 rounded-lg bg-surface p-3 text-sm">
                Hidden content revealed!
              </Disclosure.Body>
            </Disclosure.Content>
          </Disclosure>
        </Demo>

        <Demo label="DisclosureGroup">
          <DisclosureGroup className="w-64">
            <Disclosure>
              <Disclosure.Heading>
                <button
                  slot="trigger"
                  className="flex w-full justify-between py-1 text-sm"
                >
                  Section A
                  <Disclosure.Indicator />
                </button>
              </Disclosure.Heading>
              <Disclosure.Content>
                <Disclosure.Body className="text-sm text-muted">
                  Content for section A.
                </Disclosure.Body>
              </Disclosure.Content>
            </Disclosure>
            <Disclosure>
              <Disclosure.Heading>
                <button
                  slot="trigger"
                  className="flex w-full justify-between py-1 text-sm"
                >
                  Section B
                  <Disclosure.Indicator />
                </button>
              </Disclosure.Heading>
              <Disclosure.Content>
                <Disclosure.Body className="text-sm text-muted">
                  Content for section B.
                </Disclosure.Body>
              </Disclosure.Content>
            </Disclosure>
          </DisclosureGroup>
        </Demo>
      </Section>

      {/* ── Data Display ── */}
      <Section title="Data Display">
        <Demo label="Avatar">
          <Avatar>
            <Avatar.Image
              alt="Jane Doe"
              src="https://img.heroui.chat/image/avatar?w=400&h=400&u=3"
            />
            <Avatar.Fallback>JD</Avatar.Fallback>
          </Avatar>
          <Avatar size="sm">
            <Avatar.Fallback>AB</Avatar.Fallback>
          </Avatar>
          <Avatar size="lg">
            <Avatar.Fallback>XY</Avatar.Fallback>
          </Avatar>
        </Demo>

        <Demo label="Card">
          <Card className="w-64">
            <Card.Header>
              <Card.Title>Card Title</Card.Title>
              <Card.Description>
                A short description of the card.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <p className="text-sm">Card body content goes here.</p>
            </Card.Content>
            <Card.Footer>
              <Button size="sm" variant="primary">
                Action
              </Button>
            </Card.Footer>
          </Card>
        </Demo>

        <Demo label="Chip">
          <Chip>Default</Chip>
          <Chip color="accent">Accent</Chip>
          <Chip color="success">Success</Chip>
          <Chip color="warning">Warning</Chip>
          <Chip color="danger">Danger</Chip>
        </Demo>

        <Demo label="Kbd">
          <Kbd>
            <Kbd.Abbr keyValue="command" />
            <Kbd.Content>K</Kbd.Content>
          </Kbd>
          <Kbd>
            <Kbd.Abbr keyValue="shift" />
            <Kbd.Content>P</Kbd.Content>
          </Kbd>
          <Kbd>
            <Kbd.Abbr keyValue="ctrl" />
            <Kbd.Content>C</Kbd.Content>
          </Kbd>
        </Demo>

        <Demo label="Separator">
          <div className="w-64">
            <p className="text-sm">Above the separator</p>
            <Separator className="my-3" />
            <div className="flex items-center gap-2 text-sm">
              <span>Blog</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Docs</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Source</span>
            </div>
          </div>
        </Demo>

        <Demo label="Surface">
          <Surface variant="default" className="w-48 rounded-xl p-4">
            <p className="text-sm font-medium">Default</p>
            <p className="text-xs text-muted">bg-surface</p>
          </Surface>
          <Surface variant="secondary" className="w-48 rounded-xl p-4">
            <p className="text-sm font-medium">Secondary</p>
            <p className="text-xs text-muted">bg-surface-secondary</p>
          </Surface>
          <Surface variant="tertiary" className="w-48 rounded-xl p-4">
            <p className="text-sm font-medium">Tertiary</p>
            <p className="text-xs text-muted">bg-surface-tertiary</p>
          </Surface>
        </Demo>

        <Demo label="ListBox">
          <ListBox aria-label="Animals" className="w-48">
            <ListBox.Item id="cat" textValue="Cat">
              Cat
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item id="dog" textValue="Dog">
              Dog
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item id="parrot" textValue="Parrot">
              Parrot
              <ListBox.ItemIndicator />
            </ListBox.Item>
          </ListBox>
        </Demo>

        <Demo label="ScrollShadow">
          <ScrollShadow className="h-24 w-48">
            <div className="flex flex-col gap-1 p-2">
              {Array.from({ length: 10 }, (_, i) => (
                <p key={i} className="text-sm">
                  Item {i + 1}
                </p>
              ))}
            </div>
          </ScrollShadow>
        </Demo>
      </Section>

      {/* ── Typography & Labels ── */}
      <Section title="Typography & Labels">
        <Demo label="Label">
          <Label>Form label</Label>
          <Label isRequired>Required label</Label>
          <Label isDisabled>Disabled label</Label>
        </Demo>

        <Demo label="Description">
          <Description>Helper text for a form field.</Description>
        </Demo>

        <Demo label="FieldError">
          <FieldError>This field is required.</FieldError>
        </Demo>

        <Demo label="Fieldset">
          <Fieldset className="rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">Personal Info</legend>
            <div className="flex flex-col gap-2">
              <TextField name="fname">
                <Label>First name</Label>
                <Input placeholder="Jane" />
              </TextField>
            </div>
          </Fieldset>
        </Demo>
      </Section>

      {/* ── Form Inputs ── */}
      <Section title="Form Inputs">
        <Demo label="TextField">
          <TextField className="w-56" name="email" type="email">
            <Label>Email</Label>
            <Input placeholder="jane@example.com" />
          </TextField>
        </Demo>

        <Demo label="Input (standalone)">
          <Input
            aria-label="Search"
            className="w-48"
            placeholder="Plain input..."
          />
        </Demo>

        <Demo label="InputGroup">
          <TextField className="w-64" name="url">
            <Label>Website</Label>
            <InputGroup>
              <InputGroup.Prefix>
                <span className="text-xs text-muted">https://</span>
              </InputGroup.Prefix>
              <InputGroup.Input placeholder="example.com" />
            </InputGroup>
          </TextField>
        </Demo>

        <Demo label="TextArea">
          <TextArea
            aria-label="Notes"
            className="h-24 w-64"
            placeholder="Write something..."
          />
        </Demo>

        <Demo label="NumberField">
          <NumberField className="w-56" defaultValue={42} name="count">
            <Label>Count</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input className="w-20" />
              <NumberField.IncrementButton />
            </NumberField.Group>
          </NumberField>
        </Demo>

        <Demo label="SearchField">
          <SearchField name="query">
            <Label>Search</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input className="w-56" placeholder="Search..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </Demo>

        <Demo label="DateField">
          <DateField className="w-56" name="date">
            <Label>Date</Label>
            <DateInputGroup>
              <DateInputGroup.Input>
                {(segment) => <DateInputGroup.Segment segment={segment} />}
              </DateInputGroup.Input>
            </DateInputGroup>
          </DateField>
        </Demo>

        <Demo label="TimeField">
          <TimeField className="w-48" name="time">
            <Label>Time</Label>
            <DateInputGroup>
              <DateInputGroup.Input>
                {(segment) => <DateInputGroup.Segment segment={segment} />}
              </DateInputGroup.Input>
            </DateInputGroup>
          </TimeField>
        </Demo>

        <Demo label="InputOTP">
          <div className="flex flex-col gap-1">
            <Label>Verification code</Label>
            <InputOTP maxLength={6}>
              <InputOTP.Group>
                <InputOTP.Slot index={0} />
                <InputOTP.Slot index={1} />
                <InputOTP.Slot index={2} />
              </InputOTP.Group>
              <InputOTP.Separator />
              <InputOTP.Group>
                <InputOTP.Slot index={3} />
                <InputOTP.Slot index={4} />
                <InputOTP.Slot index={5} />
              </InputOTP.Group>
            </InputOTP>
          </div>
        </Demo>

        <Demo label="Select">
          <Select className="w-48" placeholder="Pick one">
            <Label>Fruit</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="apple" textValue="Apple">
                  Apple
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="banana" textValue="Banana">
                  Banana
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="cherry" textValue="Cherry">
                  Cherry
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        </Demo>

        <Demo label="ComboBox">
          <ComboBox className="w-48">
            <Label>Animal</Label>
            <ComboBox.InputGroup>
              <Input placeholder="Search..." />
              <ComboBox.Trigger />
            </ComboBox.InputGroup>
            <ComboBox.Popover>
              <ListBox>
                <ListBox.Item id="cat" textValue="Cat">
                  Cat
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="dog" textValue="Dog">
                  Dog
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="panda" textValue="Panda">
                  Panda
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </ComboBox.Popover>
          </ComboBox>
        </Demo>

        <Demo label="Checkbox">
          <Checkbox id="terms">
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Label htmlFor="terms">Accept terms</Label>
          </Checkbox>
          <Checkbox id="newsletter" defaultSelected>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Label htmlFor="newsletter">Subscribe to newsletter</Label>
          </Checkbox>
        </Demo>

        <Demo label="CheckboxGroup">
          <CheckboxGroup name="hobbies">
            <Label>Hobbies</Label>
            <Checkbox value="reading">
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Content>
                <Label>Reading</Label>
              </Checkbox.Content>
            </Checkbox>
            <Checkbox value="coding">
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Content>
                <Label>Coding</Label>
              </Checkbox.Content>
            </Checkbox>
            <Checkbox value="gaming">
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Content>
                <Label>Gaming</Label>
              </Checkbox.Content>
            </Checkbox>
          </CheckboxGroup>
        </Demo>

        <Demo label="RadioGroup">
          <RadioGroup defaultValue="standard" name="shipping">
            <Label>Shipping speed</Label>
            <Radio value="standard">
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              <Radio.Content>
                <Label>Standard</Label>
                <Description>3–5 business days</Description>
              </Radio.Content>
            </Radio>
            <Radio value="express">
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              <Radio.Content>
                <Label>Express</Label>
                <Description>1–2 business days</Description>
              </Radio.Content>
            </Radio>
          </RadioGroup>
        </Demo>

        <Demo label="Switch">
          <Switch>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Label>Dark mode</Label>
          </Switch>
          <Switch defaultSelected>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Label>Notifications</Label>
          </Switch>
        </Demo>

        <Demo label="Slider">
          <Slider className="w-56" defaultValue={40}>
            <Label>Volume</Label>
            <Slider.Output />
            <Slider.Track>
              <Slider.Fill />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>
        </Demo>

        <Demo label="TagGroup">
          <TagGroup aria-label="Topics" selectionMode="multiple">
            <TagGroup.List>
              <Tag id="react">React</Tag>
              <Tag id="ts">TypeScript</Tag>
              <Tag id="css">CSS</Tag>
              <Tag id="a11y">Accessibility</Tag>
            </TagGroup.List>
          </TagGroup>
        </Demo>

        <Demo label="Form (with validation)">
          <Form
            className="flex w-64 flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              alert("Submitted!");
            }}
          >
            <TextField isRequired name="username">
              <Label>Username</Label>
              <Input placeholder="hero_user" />
              <FieldError />
            </TextField>
            <Button type="submit" variant="primary">
              Submit
            </Button>
          </Form>
        </Demo>
      </Section>

      {/* ── Overlays ── */}
      <Section title="Overlays">
        <Demo label="Modal">
          <Modal>
            <Button variant="secondary">Open Modal</Button>
            <Modal.Backdrop>
              <Modal.Container>
                <Modal.Dialog className="sm:max-w-sm">
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading>Welcome to HeroUI</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    <p className="text-sm text-muted">
                      A modern React UI library built on Tailwind CSS v4 and
                      React Aria.
                    </p>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button className="w-full" slot="close" variant="primary">
                      Got it
                    </Button>
                  </Modal.Footer>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>
        </Demo>

        <Demo label="AlertDialog">
          <AlertDialog>
            <Button variant="danger">Delete Item</Button>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog className="sm:max-w-sm">
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="danger" />
                    <AlertDialog.Heading>
                      Delete permanently?
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted">
                      This action cannot be undone.
                    </p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button slot="close" variant="tertiary">
                      Cancel
                    </Button>
                    <Button slot="close" variant="danger">
                      Delete
                    </Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        </Demo>

        <Demo label="Popover">
          <Popover>
            <Button variant="secondary">Open Popover</Button>
            <Popover.Content className="max-w-xs">
              <Popover.Dialog>
                <Popover.Heading>Popover Title</Popover.Heading>
                <p className="mt-2 text-sm text-muted">
                  This is popover content. You can put anything here.
                </p>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
        </Demo>

        <Demo label="Dropdown">
          <Dropdown>
            <Button variant="secondary">Actions</Button>
            <Dropdown.Popover>
              <Dropdown.Menu>
                <Dropdown.Item id="new" textValue="New file">
                  <Label>New file</Label>
                </Dropdown.Item>
                <Dropdown.Item id="copy" textValue="Copy link">
                  <Label>Copy link</Label>
                </Dropdown.Item>
                <Dropdown.Item id="delete" textValue="Delete" variant="danger">
                  <Label>Delete</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </Demo>

        <Demo label="Tooltip">
          <Tooltip delay={0}>
            <Button variant="secondary">Hover me</Button>
            <Tooltip.Content>
              <p>Helpful tooltip text</p>
            </Tooltip.Content>
          </Tooltip>
        </Demo>
      </Section>

      {/* ── Feedback ── */}
      <Section title="Feedback">
        <Demo label="Alert">
          <div className="flex w-80 flex-col gap-3">
            <Alert>
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Info</Alert.Title>
                <Alert.Description>
                  New features are available.
                </Alert.Description>
              </Alert.Content>
            </Alert>
            <Alert status="accent">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Accent</Alert.Title>
                <Alert.Description>An important notice.</Alert.Description>
              </Alert.Content>
            </Alert>
            <Alert status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Success</Alert.Title>
                <Alert.Description>
                  Changes saved successfully.
                </Alert.Description>
              </Alert.Content>
            </Alert>
            <Alert status="warning">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Warning</Alert.Title>
                <Alert.Description>Proceed with caution.</Alert.Description>
              </Alert.Content>
            </Alert>
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Error</Alert.Title>
                <Alert.Description>Something went wrong.</Alert.Description>
              </Alert.Content>
            </Alert>
          </div>
        </Demo>

        <Demo label="Toast">
          <Button
            variant="secondary"
            onPress={() =>
              toastQueue.add({
                title: "Changes saved",
                description: "Your changes have been saved successfully.",
              })
            }
          >
            Show toast
          </Button>
        </Demo>

        <Demo label="Spinner">
          <Spinner />
          <Spinner size="sm" />
          <Spinner size="lg" color="accent" />
        </Demo>

        <Demo label="Skeleton">
          <div className="w-56 space-y-3 rounded-lg p-3">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-3 w-4/5 rounded" />
            <Skeleton className="h-3 w-3/5 rounded" />
            <Skeleton className="h-3 w-2/5 rounded" />
          </div>
        </Demo>
      </Section>

      {/* ── Color ── */}
      <Section title="Color">
        <Demo label="ColorSwatch">
          <ColorSwatch aria-label="Blue" color="#0485F7" />
          <ColorSwatch aria-label="Red" color="#EF4444" />
          <ColorSwatch aria-label="Amber" color="#F59E0B" />
          <ColorSwatch aria-label="Green" color="#10B981" />
          <ColorSwatch aria-label="Purple" color="#8B5CF6" />
        </Demo>

        <Demo label="ColorSwatchPicker">
          <ColorSwatchPicker>
            {[
              "#F43F5E",
              "#D946EF",
              "#8B5CF6",
              "#3B82F6",
              "#10B981",
              "#F59E0B",
            ].map((color) => (
              <ColorSwatchPicker.Item key={color} color={color}>
                <ColorSwatchPicker.Swatch />
                <ColorSwatchPicker.Indicator />
              </ColorSwatchPicker.Item>
            ))}
          </ColorSwatchPicker>
        </Demo>

        <Demo label="ColorArea">
          <ColorArea defaultValue="rgb(116, 52, 255)" className="h-32 w-32">
            <ColorArea.Thumb />
          </ColorArea>
        </Demo>

        <Demo label="ColorSlider">
          <ColorSlider
            channel="hue"
            className="w-56"
            defaultValue="hsl(0, 100%, 50%)"
          >
            <Label>Hue</Label>
            <ColorSlider.Output />
            <ColorSlider.Track>
              <ColorSlider.Thumb />
            </ColorSlider.Track>
          </ColorSlider>
        </Demo>

        <Demo label="ColorField">
          <ColorField
            className="w-48"
            name="color"
            value={colorFieldValue}
            onChange={setColorFieldValue}
          >
            <Label>Hex color</Label>
            <ColorInputGroup>
              <ColorInputGroup.Prefix>
                <ColorSwatch color={colorFieldValue ?? undefined} size="xs" />
              </ColorInputGroup.Prefix>
              <ColorInputGroup.Input />
            </ColorInputGroup>
          </ColorField>
        </Demo>

        <Demo label="ColorPicker">
          <ColorPicker defaultValue="#0485F7">
            <ColorPicker.Trigger>
              <ColorSwatch size="lg" />
              <Label>Pick a color</Label>
            </ColorPicker.Trigger>
            <ColorPicker.Popover>
              <ColorArea
                aria-label="Color area"
                className="max-w-full"
                colorSpace="hsb"
                xChannel="saturation"
                yChannel="brightness"
              >
                <ColorArea.Thumb />
              </ColorArea>
              <ColorSlider
                channel="hue"
                className="gap-1 px-1"
                colorSpace="hsb"
              >
                <Label>Hue</Label>
                <ColorSlider.Output className="text-muted" />
                <ColorSlider.Track>
                  <ColorSlider.Thumb />
                </ColorSlider.Track>
              </ColorSlider>
            </ColorPicker.Popover>
          </ColorPicker>
        </Demo>
      </Section>
    </div>
  );
}
