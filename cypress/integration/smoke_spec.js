describe('Smoke tests', () => {
    it('Demo loads.', () => {
        cy.visit('https://gh.lum.ai/tag-example/');
        cy.contains('TAG Example');
        cy.get('.tag-svg')
        .children('svg')
        .should('have.length',  1);
    })
})