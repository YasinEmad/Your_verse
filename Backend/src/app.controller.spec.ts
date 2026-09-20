describe('AppController', () => {
  let appController: { health: () => { status: string } };

  beforeEach(async () => {
    const { Test } = await import('@nestjs/testing');
    const { AppController } = await import('./app.controller.js');
    const { AppService } = await import('./app.service.js');

    const app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get(AppController);
  });

  it('should return a healthy status payload', () => {
    expect(appController.health()).toEqual({ status: 'ok' });
  });
});
